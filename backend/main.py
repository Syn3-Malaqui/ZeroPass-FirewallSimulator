from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
import json
import ipaddress
import jwt
import time
from datetime import datetime, timedelta
import re
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ZeroPass Firewall Simulator API",
    description="Enterprise API Gateway Firewall Rule Simulator",
    version="1.0.0"
)

# Get allowed origins from environment variable or use default
# Include Vercel deployment domains and render domains
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,https://*.vercel.app,https://*.zeropass.dev,https://zeropass-firewall-simulator.vercel.app").split(",")
logger.info(f"CORS allowed origins: {allowed_origins}")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for easy deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (replace with Redis in production)
rule_sets: Dict[str, Any] = {}
rate_limit_store: Dict[str, Dict[str, Any]] = {}
evaluation_logs: List[Dict[str, Any]] = []

# User isolation utility functions
def get_user_id(x_user_id: Optional[str] = None) -> str:
    """Extract user ID from header or generate a default one"""
    if x_user_id:
        return x_user_id
    # Fallback for requests without user ID (legacy)
    return "anonymous_user"

def filter_by_user(items: List[Dict[str, Any]], user_id: str) -> List[Dict[str, Any]]:
    """Filter items to only return those belonging to the specified user"""
    return [item for item in items if item.get('userId') == user_id]

def add_user_id_to_item(item: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Add user ID to an item"""
    item['userId'] = user_id
    return item

# Models
class IPRule(BaseModel):
    type: str = Field(..., pattern="^(allow|block)$")
    cidrs: List[str]

class JWTRule(BaseModel):
    enabled: bool = True
    required_claims: Optional[Dict[str, Any]] = None
    issuer: Optional[str] = None
    audience: Optional[str] = None

class OAuth2Rule(BaseModel):
    enabled: bool = True
    required_scopes: List[str] = []

class RateLimitRule(BaseModel):
    enabled: bool = True
    requests_per_window: int = Field(..., gt=0)
    window_seconds: int = Field(..., gt=0)
    
class HeaderRule(BaseModel):
    header_name: str
    condition: str = Field(..., pattern="^(equals|contains|regex|exists)$")
    value: Optional[str] = None

class PathRule(BaseModel):
    methods: List[str] = []
    path_pattern: str
    condition: str = Field(..., pattern="^(equals|prefix|regex)$")

class FirewallRuleSet(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    ip_rules: Optional[IPRule] = None
    jwt_validation: Optional[JWTRule] = None
    oauth2_validation: Optional[OAuth2Rule] = None
    rate_limiting: Optional[RateLimitRule] = None
    header_rules: List[HeaderRule] = []
    path_rules: List[PathRule] = []
    default_action: str = Field(..., pattern="^(allow|block)$")
    userId: Optional[str] = None  # Added for user isolation

# Rule Templates Models
class RuleTemplate(BaseModel):
    id: str
    name: str
    description: str
    category: str
    rule_configuration: Dict[str, Any]
    is_public: bool = True
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    userId: Optional[str] = None  # For user isolation

# Exploit Scenarios Models
class ExploitScenario(BaseModel):
    id: str
    name: str
    description: str
    category: str
    attack_type: str
    test_requests: List[Dict[str, Any]]
    expected_results: List[str]  # Expected decisions (ALLOW/BLOCK)
    is_public: bool = True
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    userId: Optional[str] = None  # For user isolation

class ScenarioTestResult(BaseModel):
    scenario_id: str
    rule_set_id: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    test_details: List[Dict[str, Any]]
    coverage_score: float
    effectiveness_score: float
    userId: Optional[str] = None  # For user isolation

class SimulationRequest(BaseModel):
    rule_set_id: str
    client_ip: str
    method: str
    path: str
    headers: Dict[str, str] = {}
    jwt_token: Optional[str] = None
    oauth_scopes: List[str] = []
    userId: Optional[str] = None  # Added for user isolation

class SimulationResult(BaseModel):
    decision: str
    matched_rule: Optional[str] = None
    reason: str
    evaluation_details: List[str] = []
    userId: Optional[str] = None  # Added for user isolation

# After all model classes are defined (after ScenarioTestResult class)
# Storage for templates and scenarios
rule_templates: Dict[str, RuleTemplate] = {}
exploit_scenarios: Dict[str, ExploitScenario] = {}
scenario_test_results: List[ScenarioTestResult] = []

# Utility functions
def validate_cidr(cidr: str) -> bool:
    try:
        ipaddress.ip_network(cidr, strict=False)
        return True
    except ValueError:
        return False

def validate_ip_against_cidrs(ip: str, cidrs: List[str]) -> bool:
    try:
        client_ip = ipaddress.ip_address(ip)
        for cidr in cidrs:
            if client_ip in ipaddress.ip_network(cidr, strict=False):
                return True
        return False
    except ValueError:
        return False

def validate_jwt_token(token: str, jwt_rule: JWTRule) -> tuple[bool, str]:
    try:
        # For simulation, we'll use a simple validation
        # In production, you'd verify with proper keys
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Check issuer
        if jwt_rule.issuer and decoded.get('iss') != jwt_rule.issuer:
            return False, f"Invalid issuer. Expected: {jwt_rule.issuer}"
        
        # Check audience
        if jwt_rule.audience and decoded.get('aud') != jwt_rule.audience:
            return False, f"Invalid audience. Expected: {jwt_rule.audience}"
        
        # Check required claims
        if jwt_rule.required_claims:
            for claim, expected_value in jwt_rule.required_claims.items():
                if claim not in decoded:
                    return False, f"Missing required claim: {claim}"
                if decoded[claim] != expected_value:
                    return False, f"Invalid claim value for {claim}"
        
        # Check expiration
        if 'exp' in decoded:
            if datetime.utcnow().timestamp() > decoded['exp']:
                return False, "Token expired"
        
        return True, "JWT validation passed"
    
    except jwt.InvalidTokenError as e:
        return False, f"Invalid JWT token: {str(e)}"

def check_rate_limit(client_ip: str, rule_set_id: str, rate_rule: RateLimitRule) -> tuple[bool, str]:
    current_time = time.time()
    key = f"{rule_set_id}:{client_ip}"
    
    if key not in rate_limit_store:
        rate_limit_store[key] = {
            'requests': [],
            'window_start': current_time
        }
    
    client_data = rate_limit_store[key]
    
    # Clean old requests outside the window
    window_start = current_time - rate_rule.window_seconds
    client_data['requests'] = [req_time for req_time in client_data['requests'] if req_time > window_start]
    
    # Check if limit exceeded
    if len(client_data['requests']) >= rate_rule.requests_per_window:
        return False, f"Rate limit exceeded: {rate_rule.requests_per_window} requests per {rate_rule.window_seconds} seconds"
    
    # Add current request
    client_data['requests'].append(current_time)
    
    return True, f"Rate limit check passed: {len(client_data['requests'])}/{rate_rule.requests_per_window}"

def validate_header_rule(headers: Dict[str, str], header_rule: HeaderRule) -> tuple[bool, str]:
    header_value = headers.get(header_rule.header_name)
    
    if header_rule.condition == "exists":
        if header_value is None:
            return False, f"Header {header_rule.header_name} does not exist"
        return True, f"Header {header_rule.header_name} exists"
    
    if header_value is None:
        return False, f"Header {header_rule.header_name} not found"
    
    if header_rule.condition == "equals":
        if header_value == header_rule.value:
            return True, f"Header {header_rule.header_name} equals {header_rule.value}"
        return False, f"Header {header_rule.header_name} does not equal {header_rule.value}"
    
    elif header_rule.condition == "contains":
        if header_rule.value and header_rule.value in header_value:
            return True, f"Header {header_rule.header_name} contains {header_rule.value}"
        return False, f"Header {header_rule.header_name} does not contain {header_rule.value}"
    
    elif header_rule.condition == "regex":
        try:
            if header_rule.value and re.search(header_rule.value, header_value):
                return True, f"Header {header_rule.header_name} matches regex {header_rule.value}"
            return False, f"Header {header_rule.header_name} does not match regex {header_rule.value}"
        except re.error:
            return False, f"Invalid regex pattern: {header_rule.value}"

def validate_path_rule(method: str, path: str, path_rule: PathRule) -> tuple[bool, str]:
    # Check method
    if path_rule.methods and method.upper() not in [m.upper() for m in path_rule.methods]:
        return False, f"Method {method} not in allowed methods: {path_rule.methods}"
    
    # Check path
    if path_rule.condition == "equals":
        if path == path_rule.path_pattern:
            return True, f"Path {path} equals {path_rule.path_pattern}"
        return False, f"Path {path} does not equal {path_rule.path_pattern}"
    
    elif path_rule.condition == "prefix":
        if path.startswith(path_rule.path_pattern):
            return True, f"Path {path} starts with {path_rule.path_pattern}"
        return False, f"Path {path} does not start with {path_rule.path_pattern}"
    
    elif path_rule.condition == "regex":
        try:
            if re.search(path_rule.path_pattern, path):
                return True, f"Path {path} matches regex {path_rule.path_pattern}"
            return False, f"Path {path} does not match regex {path_rule.path_pattern}"
        except re.error:
            return False, f"Invalid regex pattern: {path_rule.path_pattern}"

# Initialize default templates and scenarios
def initialize_default_templates():
    """Initialize default rule templates"""
    default_templates = [
        {
            "id": "basic-api-security",
            "name": "Basic API Security",
            "description": "Essential security rules for REST APIs including rate limiting and header validation",
            "category": "API Security",
            "rule_configuration": {
                "name": "Basic API Security Template",
                "description": "Rate limiting + basic header validation",
                "rate_limiting": {
                    "enabled": True,
                    "requests_per_window": 100,
                    "window_seconds": 60
                },
                "header_rules": [
                    {"header_name": "Content-Type", "condition": "equals", "value": "application/json"},
                    {"header_name": "User-Agent", "condition": "exists"}
                ],
                "default_action": "allow"
            },
            "is_public": True,
            "created_by": "system",
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "jwt-auth-security",
            "name": "JWT Authentication Security",
            "description": "Comprehensive JWT validation with claims checking",
            "category": "Authentication",
            "rule_configuration": {
                "name": "JWT Authentication Template",
                "description": "JWT validation with issuer and audience checks",
                "jwt_validation": {
                    "enabled": True,
                    "issuer": "your-auth-service",
                    "audience": "your-api",
                    "required_claims": {"scope": "api:read"}
                },
                "default_action": "block"
            },
            "is_public": True,
            "created_by": "system",
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "oauth2-scopes",
            "name": "OAuth2 Authorization",
            "description": "Fine-grained OAuth2 scope-based access control",
            "category": "Authorization",
            "rule_configuration": {
                "name": "OAuth2 Scopes Template",
                "description": "OAuth2 scope enforcement",
                "oauth2_validation": {
                    "enabled": True,
                    "required_scopes": ["read", "write"]
                },
                "default_action": "block"
            },
            "is_public": True,
            "created_by": "system",
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "admin-api-protection",
            "name": "Admin API Protection",
            "description": "High-security rules for administrative endpoints",
            "category": "Admin Security",
            "rule_configuration": {
                "name": "Admin API Protection Template",
                "description": "Strict controls for admin endpoints",
                "ip_rules": {
                    "type": "allow",
                    "cidrs": ["10.0.0.0/8", "192.168.0.0/16"]
                },
                "jwt_validation": {
                    "enabled": True,
                    "required_claims": {"role": "admin", "permissions": "admin:full"}
                },
                "rate_limiting": {
                    "enabled": True,
                    "requests_per_window": 10,
                    "window_seconds": 60
                },
                "path_rules": [
                    {"methods": ["GET", "POST", "PUT", "DELETE"], "path_pattern": "/admin/*", "condition": "prefix"}
                ],
                "default_action": "block"
            },
            "is_public": True,
            "created_by": "system",
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]
    
    for template_data in default_templates:
        template = RuleTemplate(**template_data)
        rule_templates[template.id] = template

def initialize_default_scenarios():
    """Initialize default exploit scenarios"""
    default_scenarios = [
        {
            "id": "sql-injection-test",
            "name": "SQL Injection Test",
            "description": "Tests protection against SQL injection attempts",
            "category": "Injection Attacks",
            "attack_type": "SQL Injection",
            "test_requests": [
                {
                    "client_ip": "192.168.1.100",
                    "method": "GET",
                    "path": "/api/users?id=1' OR '1'='1",
                    "headers": {"Content-Type": "application/json"},
                    "description": "Basic SQL injection in query parameter"
                },
                {
                    "client_ip": "192.168.1.100",
                    "method": "POST",
                    "path": "/api/login",
                    "headers": {"Content-Type": "application/json"},
                    "body": {"username": "admin'; DROP TABLE users; --", "password": "password"},
                    "description": "SQL injection in POST body"
                }
            ],
            "expected_results": ["BLOCKED", "BLOCKED"],
            "is_public": True,
            "created_by": "system",
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "jwt-tampering-test",
            "name": "JWT Tampering Test",
            "description": "Tests JWT validation against tampered tokens",
            "category": "Authentication Bypass",
            "attack_type": "JWT Manipulation",
            "test_requests": [
                {
                    "client_ip": "192.168.1.100",
                    "method": "GET",
                    "path": "/api/protected",
                    "headers": {"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid_signature"},
                    "jwt_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid_signature",
                    "description": "Tampered JWT with invalid signature"
                },
                {
                    "client_ip": "192.168.1.100",
                    "method": "GET",
                    "path": "/api/protected",
                    "headers": {"Authorization": "Bearer expired_token"},
                    "jwt_token": "expired_token",
                    "description": "Expired JWT token"
                }
            ],
            "expected_results": ["BLOCKED", "BLOCKED"],
            "is_public": True,
            "created_by": "system",
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "rate-limit-evasion",
            "name": "Rate Limiting Evasion",
            "description": "Tests rate limiting effectiveness",
            "category": "DoS/DDoS",
            "attack_type": "Rate Limit Bypass",
            "test_requests": [
                {
                    "client_ip": f"192.168.1.{i}",
                    "method": "GET",
                    "path": "/api/data",
                    "headers": {"Content-Type": "application/json"},
                    "description": f"Request {i+1} from different IP"
                } for i in range(10)
            ],
            "expected_results": ["ALLOWED"] * 5 + ["BLOCKED"] * 5,  # Assuming rate limit of 5 requests
            "is_public": True,
            "created_by": "system",
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]
    
    for scenario_data in default_scenarios:
        scenario = ExploitScenario(**scenario_data)
        exploit_scenarios[scenario.id] = scenario

# Initialize defaults on startup
initialize_default_templates()
initialize_default_scenarios()

# API Endpoints
@app.get("/")
async def root():
    return {"message": "ZeroPass Firewall Simulator API", "status": "running"}

@app.post("/rules", response_model=Dict[str, str])
async def create_rule_set(rule_set: FirewallRuleSet, x_user_id: Optional[str] = Header(None)):
    """Create or update a firewall rule set with user isolation"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Creating/updating rule set '{rule_set.id}' for user: {user_id}")
        
        # Add user ID to the rule set
        rule_set_dict = rule_set.dict()
        rule_set_dict = add_user_id_to_item(rule_set_dict, user_id)
        
        # Validate CIDR blocks if IP rules exist
        if rule_set.ip_rules:
            for cidr in rule_set.ip_rules.cidrs:
                if not validate_cidr(cidr):
                    raise HTTPException(status_code=400, detail=f"Invalid CIDR format: {cidr}")
        
        # Store the rule set
        rule_sets[rule_set.id] = rule_set_dict
        
        logger.info(f"✅ Rule set '{rule_set.id}' stored successfully for user: {user_id}")
        return {"status": "success", "rule_set_id": rule_set.id}
    
    except Exception as e:
        logger.error(f"❌ Error creating rule set: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rules", response_model=List[Dict[str, Any]])
async def get_rule_sets(x_user_id: Optional[str] = Header(None)):
    """Get all rule sets for the current user"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Fetching rule sets for user: {user_id}")
        
        # Convert to list and filter by user
        all_rule_sets = list(rule_sets.values())
        user_rule_sets = filter_by_user(all_rule_sets, user_id)
        
        logger.info(f"📊 Returning {len(user_rule_sets)} rule sets for user: {user_id} (out of {len(all_rule_sets)} total)")
        return user_rule_sets
    
    except Exception as e:
        logger.error(f"❌ Error fetching rule sets: {str(e)}")
        return []

@app.get("/rules/{rule_set_id}", response_model=Dict[str, Any])
async def get_rule_set(rule_set_id: str, x_user_id: Optional[str] = Header(None)):
    """Get a specific rule set if it belongs to the current user"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Fetching rule set '{rule_set_id}' for user: {user_id}")
        
        if rule_set_id not in rule_sets:
            raise HTTPException(status_code=404, detail="Rule set not found")
        
        rule_set = rule_sets[rule_set_id]
        
        # Check if the rule set belongs to the current user
        if rule_set.get('userId') != user_id:
            logger.warning(f"🚫 Access denied: Rule set '{rule_set_id}' belongs to different user")
            raise HTTPException(status_code=404, detail="Rule set not found")
        
        return rule_set
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching rule set: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/rules/{rule_set_id}")
async def delete_rule_set(rule_set_id: str, x_user_id: Optional[str] = Header(None)):
    """Delete a rule set if it belongs to the current user"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Deleting rule set '{rule_set_id}' for user: {user_id}")
        
        if rule_set_id not in rule_sets:
            raise HTTPException(status_code=404, detail="Rule set not found")
        
        rule_set = rule_sets[rule_set_id]
        
        # Check if the rule set belongs to the current user
        if rule_set.get('userId') != user_id:
            logger.warning(f"🚫 Access denied: Cannot delete rule set '{rule_set_id}' - belongs to different user")
            raise HTTPException(status_code=404, detail="Rule set not found")
        
        # Delete the rule set
        del rule_sets[rule_set_id]
        
        logger.info(f"✅ Rule set '{rule_set_id}' deleted successfully for user: {user_id}")
        return {"status": "success", "message": f"Rule set {rule_set_id} deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting rule set: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate", response_model=SimulationResult)
async def simulate_request(simulation: SimulationRequest, x_user_id: Optional[str] = Header(None)):
    """Simulate an API request against firewall rules with user isolation"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Simulating request for user: {user_id}, rule_set: {simulation.rule_set_id}")
        
        # Add user ID to simulation if not present
        if not simulation.userId:
            simulation.userId = user_id
        
        if simulation.rule_set_id not in rule_sets:
            raise HTTPException(status_code=404, detail="Rule set not found")
        
        rule_set_data = rule_sets[simulation.rule_set_id]
        
        # Check if the rule set belongs to the current user
        if rule_set_data.get('userId') != user_id:
            logger.warning(f"🚫 Access denied: Rule set '{simulation.rule_set_id}' belongs to different user")
            raise HTTPException(status_code=404, detail="Rule set not found")
        
        rule_set = FirewallRuleSet(**rule_set_data)
        evaluation_details = []
        
        # Check IP rules first
        if rule_set.ip_rules:
            ip_match = validate_ip_against_cidrs(simulation.client_ip, rule_set.ip_rules.cidrs)
            if rule_set.ip_rules.type == "block" and ip_match:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="ip_rules",
                    reason=f"IP {simulation.client_ip} is in blocked CIDR list",
                    evaluation_details=evaluation_details,
                    userId=user_id
                )
                # Log evaluation with user ID
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict(),
                    "userId": user_id
                }
                evaluation_logs.append(log_entry)
                logger.info(f"🚫 Request blocked by IP rules for user: {user_id}")
                return result
            
            elif rule_set.ip_rules.type == "allow" and not ip_match:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="ip_rules",
                    reason=f"IP {simulation.client_ip} is not in allowed CIDR list",
                    evaluation_details=evaluation_details,
                    userId=user_id
                )
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict(),
                    "userId": user_id
                }
                evaluation_logs.append(log_entry)
                logger.info(f"🚫 Request blocked by IP rules for user: {user_id}")
                return result
            
            evaluation_details.append(f"IP rule check passed for {simulation.client_ip}")
        
        # Check JWT validation
        if rule_set.jwt_validation and rule_set.jwt_validation.enabled:
            if not simulation.jwt_token:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="jwt_validation",
                    reason="JWT token required but not provided",
                    evaluation_details=evaluation_details,
                    userId=user_id
                )
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict(),
                    "userId": user_id
                }
                evaluation_logs.append(log_entry)
                return result
            
            jwt_valid, jwt_reason = validate_jwt_token(simulation.jwt_token, rule_set.jwt_validation)
            if not jwt_valid:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="jwt_validation",
                    reason=jwt_reason,
                    evaluation_details=evaluation_details,
                    userId=user_id
                )
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict(),
                    "userId": user_id
                }
                evaluation_logs.append(log_entry)
                return result
            
            evaluation_details.append(jwt_reason)
        
        # Check OAuth2 validation
        if rule_set.oauth2_validation and rule_set.oauth2_validation.enabled:
            required_scopes = set(rule_set.oauth2_validation.required_scopes)
            provided_scopes = set(simulation.oauth_scopes)
            missing_scopes = required_scopes - provided_scopes
            
            if missing_scopes:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="oauth2_validation",
                    reason=f"Missing required OAuth2 scopes: {list(missing_scopes)}",
                    evaluation_details=evaluation_details,
                    userId=user_id
                )
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict(),
                    "userId": user_id
                }
                evaluation_logs.append(log_entry)
                return result
            
            evaluation_details.append(f"OAuth2 scope validation passed: {list(provided_scopes)}")
        
        # Check rate limiting
        if rule_set.rate_limiting and rule_set.rate_limiting.enabled:
            rate_ok, rate_reason = check_rate_limit(
                simulation.client_ip, 
                simulation.rule_set_id, 
                rule_set.rate_limiting
            )
            if not rate_ok:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="rate_limiting",
                    reason=rate_reason,
                    evaluation_details=evaluation_details,
                    userId=user_id
                )
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict(),
                    "userId": user_id
                }
                evaluation_logs.append(log_entry)
                return result
            
            evaluation_details.append(rate_reason)
        
        # Check header rules
        for header_rule in rule_set.header_rules:
            header_ok, header_reason = validate_header_rule(simulation.headers, header_rule)
            if not header_ok:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="header_rules",
                    reason=header_reason,
                    evaluation_details=evaluation_details,
                    userId=user_id
                )
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict(),
                    "userId": user_id
                }
                evaluation_logs.append(log_entry)
                return result
            evaluation_details.append(header_reason)
        
        # Check path rules
        for path_rule in rule_set.path_rules:
            path_ok, path_reason = validate_path_rule(simulation.method, simulation.path, path_rule)
            if not path_ok:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="path_rules",
                    reason=path_reason,
                    evaluation_details=evaluation_details,
                    userId=user_id
                )
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict(),
                    "userId": user_id
                }
                evaluation_logs.append(log_entry)
                return result
            evaluation_details.append(path_reason)
        
        # If all checks pass, apply default action
        decision = "ALLOWED" if rule_set.default_action == "allow" else "BLOCKED"
        result = SimulationResult(
            decision=decision,
            matched_rule="default_action",
            reason=f"All rules passed, applying default action: {rule_set.default_action}",
            evaluation_details=evaluation_details,
            userId=user_id
        )
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "rule_set_id": simulation.rule_set_id,
            "client_ip": simulation.client_ip,
            "result": result.dict(),
            "userId": user_id
        }
        evaluation_logs.append(log_entry)
        
        logger.info(f"✅ Simulation completed for user: {user_id}, decision: {decision}")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error during simulation for user {get_user_id(x_user_id)}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/logs", response_model=List[Dict[str, Any]])
async def get_evaluation_logs(limit: int = 100, x_user_id: Optional[str] = Header(None)):
    """Get evaluation logs for the current user only"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Fetching evaluation logs for user: {user_id}")
        
        # Filter logs by user and apply limit
        user_logs = filter_by_user(evaluation_logs, user_id)
        limited_logs = user_logs[-limit:] if user_logs else []
        
        logger.info(f"📊 Returning {len(limited_logs)} logs for user: {user_id} (out of {len(evaluation_logs)} total)")
        return limited_logs
    
    except Exception as e:
        logger.error(f"❌ Error fetching logs: {str(e)}")
        return []

@app.delete("/logs")
async def clear_evaluation_logs(x_user_id: Optional[str] = Header(None)):
    """Clear evaluation logs for the current user only"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Clearing evaluation logs for user: {user_id}")
        
        global evaluation_logs
        # Remove only the current user's logs
        user_logs_count = len(filter_by_user(evaluation_logs, user_id))
        evaluation_logs = [log for log in evaluation_logs if log.get('userId') != user_id]
        
        logger.info(f"🧹 Cleared {user_logs_count} logs for user: {user_id}")
        return {"message": f"Cleared {user_logs_count} evaluation logs"}
    
    except Exception as e:
        logger.error(f"❌ Error clearing logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Template Management Endpoints
@app.get("/templates", response_model=List[Dict[str, Any]])
async def get_rule_templates(category: Optional[str] = None, x_user_id: Optional[str] = Header(None)):
    """Get all available rule templates, filtered by category if specified"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Fetching templates for user: {user_id}, category: {category}")
        
        # Get public templates and user's private templates
        available_templates = []
        for template in rule_templates.values():
            if template.is_public or template.userId == user_id:
                available_templates.append(template.dict())
        
        # Filter by category if specified
        if category:
            available_templates = [t for t in available_templates if t['category'] == category]
        
        logger.info(f"📊 Returning {len(available_templates)} templates for user: {user_id}")
        return available_templates
    
    except Exception as e:
        logger.error(f"❌ Error fetching templates: {str(e)}")
        return []

@app.get("/templates/{template_id}", response_model=Dict[str, Any])
async def get_rule_template(template_id: str, x_user_id: Optional[str] = Header(None)):
    """Get a specific rule template"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Fetching template {template_id} for user: {user_id}")
        
        if template_id not in rule_templates:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template = rule_templates[template_id]
        # Check access: public templates or user's own templates
        if not template.is_public and template.userId != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this template")
        
        return template.dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/templates/{template_id}/apply", response_model=Dict[str, str])
async def apply_rule_template(template_id: str, rule_set_name: str, x_user_id: Optional[str] = Header(None)):
    """Apply a template to create a new rule set"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Applying template {template_id} for user: {user_id}")
        
        if template_id not in rule_templates:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template = rule_templates[template_id]
        # Check access
        if not template.is_public and template.userId != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this template")
        
        # Generate new rule set ID
        import uuid
        rule_set_id = str(uuid.uuid4())
        
        # Create rule set from template
        rule_config = template.rule_configuration.copy()
        rule_config['id'] = rule_set_id
        rule_config['name'] = rule_set_name
        rule_config['userId'] = user_id
        
        # Convert to FirewallRuleSet model and validate
        rule_set = FirewallRuleSet(**rule_config)
        rule_sets[rule_set_id] = add_user_id_to_item(rule_set.dict(), user_id)
        
        logger.info(f"✅ Template {template_id} applied successfully for user: {user_id}")
        return {"message": f"Template applied successfully", "rule_set_id": rule_set_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error applying template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Exploit Scenario Endpoints
@app.get("/scenarios", response_model=List[Dict[str, Any]])
async def get_exploit_scenarios(category: Optional[str] = None, x_user_id: Optional[str] = Header(None)):
    """Get all available exploit scenarios, filtered by category if specified"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Fetching scenarios for user: {user_id}, category: {category}")
        
        # Get public scenarios and user's private scenarios
        available_scenarios = []
        for scenario in exploit_scenarios.values():
            if scenario.is_public or scenario.userId == user_id:
                available_scenarios.append(scenario.dict())
        
        # Filter by category if specified
        if category:
            available_scenarios = [s for s in available_scenarios if s['category'] == category]
        
        logger.info(f"📊 Returning {len(available_scenarios)} scenarios for user: {user_id}")
        return available_scenarios
    
    except Exception as e:
        logger.error(f"❌ Error fetching scenarios: {str(e)}")
        return []

@app.get("/scenarios/{scenario_id}", response_model=Dict[str, Any])
async def get_exploit_scenario(scenario_id: str, x_user_id: Optional[str] = Header(None)):
    """Get a specific exploit scenario"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Fetching scenario {scenario_id} for user: {user_id}")
        
        if scenario_id not in exploit_scenarios:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        scenario = exploit_scenarios[scenario_id]
        # Check access: public scenarios or user's own scenarios
        if not scenario.is_public and scenario.userId != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this scenario")
        
        return scenario.dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scenarios/{scenario_id}/test", response_model=ScenarioTestResult)
async def test_exploit_scenario(scenario_id: str, rule_set_id: str, x_user_id: Optional[str] = Header(None)):
    """Test a rule set against an exploit scenario"""
    try:
        user_id = get_user_id(x_user_id)
        logger.info(f"🔒 Testing scenario {scenario_id} against rule set {rule_set_id} for user: {user_id}")
        
        # Debug: Log all available rule sets for this user
        user_rule_sets = [rs_id for rs_id, rs_data in rule_sets.items() if rs_data.get('userId') == user_id]
        logger.info(f"📊 Available rule sets for user {user_id}: {user_rule_sets}")
        
        # Validate scenario exists and access
        if scenario_id not in exploit_scenarios:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        scenario = exploit_scenarios[scenario_id]
        if not scenario.is_public and scenario.userId != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this scenario")
        
        # Validate rule set exists and belongs to user
        if rule_set_id not in rule_sets:
            logger.error(f"❌ Rule set {rule_set_id} not found in rule_sets. Available: {list(rule_sets.keys())}")
            raise HTTPException(status_code=404, detail="Rule set not found")
        
        stored_rule_set = rule_sets[rule_set_id]
        if stored_rule_set.get('userId') != user_id:
            logger.error(f"❌ Rule set {rule_set_id} belongs to user {stored_rule_set.get('userId')}, not {user_id}")
            raise HTTPException(status_code=404, detail="Rule set not found")
        
        # Convert stored rule set back to model
        rule_set = FirewallRuleSet(**stored_rule_set)
        
        # Run the test scenario
        test_details = []
        passed_tests = 0
        total_tests = len(scenario.test_requests)
        
        for i, test_request in enumerate(scenario.test_requests):
            expected_result = scenario.expected_results[i] if i < len(scenario.expected_results) else "BLOCKED"
            
            # Create simulation request
            sim_request = SimulationRequest(
                rule_set_id=rule_set_id,
                client_ip=test_request.get('client_ip', '192.168.1.100'),
                method=test_request.get('method', 'GET'),
                path=test_request.get('path', '/'),
                headers=test_request.get('headers', {}),
                jwt_token=test_request.get('jwt_token'),
                oauth_scopes=test_request.get('oauth_scopes', []),
                userId=user_id
            )
            
            # Simulate the request (reuse existing simulation logic)
            # We need to simulate this manually here instead of calling the endpoint
            # to avoid circular dependencies
            
            evaluation_details = []
            decision = "ALLOWED"  # Default
            matched_rule = "default_action"
            reason = "Default action applied"
            
            # Basic simulation logic (simplified version)
            if rule_set.ip_rules and rule_set.ip_rules.type == "block":
                if validate_ip_against_cidrs(sim_request.client_ip, rule_set.ip_rules.cidrs):
                    decision = "BLOCKED"
                    matched_rule = "ip_rules"
                    reason = "IP blocked by IP rules"
            
            # Add JWT validation check
            if rule_set.jwt_validation and rule_set.jwt_validation.enabled:
                if not sim_request.jwt_token:
                    decision = "BLOCKED"
                    matched_rule = "jwt_validation"
                    reason = "JWT token required but not provided"
                else:
                    jwt_valid, jwt_reason = validate_jwt_token(sim_request.jwt_token, rule_set.jwt_validation)
                    if not jwt_valid:
                        decision = "BLOCKED"
                        matched_rule = "jwt_validation"
                        reason = jwt_reason
            
            # Apply default action if no blocking rules matched
            if decision == "ALLOWED" and rule_set.default_action == "block":
                decision = "BLOCKED"
            
            # Check if result matches expectation
            test_passed = decision == expected_result
            if test_passed:
                passed_tests += 1
            
            test_detail = {
                "test_number": i + 1,
                "description": test_request.get('description', f"Test {i+1}"),
                "request": test_request,
                "expected_result": expected_result,
                "actual_result": decision,
                "passed": test_passed,
                "matched_rule": matched_rule,
                "reason": reason
            }
            test_details.append(test_detail)
        
        # Calculate metrics
        failed_tests = total_tests - passed_tests
        coverage_score = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        effectiveness_score = coverage_score  # Simple effectiveness calculation
        
        result = ScenarioTestResult(
            scenario_id=scenario_id,
            rule_set_id=rule_set_id,
            total_tests=total_tests,
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            test_details=test_details,
            coverage_score=coverage_score,
            effectiveness_score=effectiveness_score,
            userId=user_id
        )
        
        # Store the result
        scenario_test_results.append(result)
        
        logger.info(f"✅ Scenario test completed for user: {user_id}, passed: {passed_tests}/{total_tests}")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error testing scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint with basic statistics"""
    try:
        # Calculate user statistics
        total_rule_sets = len(rule_sets)
        total_logs = len(evaluation_logs)
        
        # Count unique users
        unique_users = set()
        for rule_set in rule_sets.values():
            if rule_set.get('userId'):
                unique_users.add(rule_set['userId'])
        
        for log in evaluation_logs:
            if log.get('userId'):
                unique_users.add(log['userId'])
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "statistics": {
                "total_rule_sets": total_rule_sets,
                "total_logs": total_logs,
                "unique_users": len(unique_users),
                "uptime": "running"
            }
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        return {
            "status": "error", 
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 