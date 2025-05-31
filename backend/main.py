from fastapi import FastAPI, HTTPException, Request
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
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
logger.info(f"CORS allowed origins: {allowed_origins}")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Use environment variable for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (replace with Redis in production)
rule_sets: Dict[str, Any] = {}
rate_limit_store: Dict[str, Dict[str, Any]] = {}
evaluation_logs: List[Dict[str, Any]] = []

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

class SimulationRequest(BaseModel):
    rule_set_id: str
    client_ip: str
    method: str
    path: str
    headers: Dict[str, str] = {}
    jwt_token: Optional[str] = None
    oauth_scopes: List[str] = []

class SimulationResult(BaseModel):
    decision: str
    matched_rule: Optional[str] = None
    reason: str
    evaluation_details: List[str] = []

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

# API Endpoints
@app.get("/")
async def root():
    return {"message": "ZeroPass Firewall Simulator API", "status": "running"}

@app.post("/rules", response_model=Dict[str, str])
async def create_rule_set(rule_set: FirewallRuleSet):
    """Create or update a firewall rule set"""
    try:
        # Validate CIDR blocks if IP rules exist
        if rule_set.ip_rules:
            for cidr in rule_set.ip_rules.cidrs:
                if not validate_cidr(cidr):
                    raise HTTPException(status_code=400, detail=f"Invalid CIDR block: {cidr}")
        
        rule_sets[rule_set.id] = rule_set.dict()
        logger.info(f"Rule set {rule_set.id} created/updated")
        
        return {"status": "success", "rule_set_id": rule_set.id}
    
    except Exception as e:
        logger.error(f"Error creating rule set: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/rules", response_model=List[Dict[str, Any]])
async def get_rule_sets():
    """Get all rule sets"""
    return list(rule_sets.values())

@app.get("/rules/{rule_set_id}", response_model=Dict[str, Any])
async def get_rule_set(rule_set_id: str):
    """Get a specific rule set"""
    if rule_set_id not in rule_sets:
        raise HTTPException(status_code=404, detail="Rule set not found")
    return rule_sets[rule_set_id]

@app.delete("/rules/{rule_set_id}")
async def delete_rule_set(rule_set_id: str):
    """Delete a rule set"""
    if rule_set_id not in rule_sets:
        raise HTTPException(status_code=404, detail="Rule set not found")
    
    del rule_sets[rule_set_id]
    logger.info(f"Rule set {rule_set_id} deleted")
    
    return {"status": "success", "message": f"Rule set {rule_set_id} deleted"}

@app.post("/simulate", response_model=SimulationResult)
async def simulate_request(simulation: SimulationRequest):
    """Simulate an API request against firewall rules"""
    try:
        if simulation.rule_set_id not in rule_sets:
            raise HTTPException(status_code=404, detail="Rule set not found")
        
        rule_set = FirewallRuleSet(**rule_sets[simulation.rule_set_id])
        evaluation_details = []
        
        # Check IP rules first
        if rule_set.ip_rules:
            ip_match = validate_ip_against_cidrs(simulation.client_ip, rule_set.ip_rules.cidrs)
            if rule_set.ip_rules.type == "block" and ip_match:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="ip_rules",
                    reason=f"IP {simulation.client_ip} is in blocked CIDR list",
                    evaluation_details=evaluation_details
                )
                # Log evaluation
                evaluation_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict()
                })
                return result
            
            elif rule_set.ip_rules.type == "allow" and not ip_match:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="ip_rules",
                    reason=f"IP {simulation.client_ip} is not in allowed CIDR list",
                    evaluation_details=evaluation_details
                )
                evaluation_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict()
                })
                return result
            
            evaluation_details.append(f"IP rule check passed for {simulation.client_ip}")
        
        # Check JWT validation
        if rule_set.jwt_validation and rule_set.jwt_validation.enabled:
            if not simulation.jwt_token:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="jwt_validation",
                    reason="JWT token required but not provided",
                    evaluation_details=evaluation_details
                )
                evaluation_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict()
                })
                return result
            
            jwt_valid, jwt_reason = validate_jwt_token(simulation.jwt_token, rule_set.jwt_validation)
            if not jwt_valid:
                result = SimulationResult(
                    decision="BLOCKED",
                    matched_rule="jwt_validation",
                    reason=jwt_reason,
                    evaluation_details=evaluation_details
                )
                evaluation_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict()
                })
                return result
            
            evaluation_details.append(jwt_reason)
        
        # Check OAuth2 scopes
        if rule_set.oauth2_validation and rule_set.oauth2_validation.enabled:
            if rule_set.oauth2_validation.required_scopes:
                missing_scopes = set(rule_set.oauth2_validation.required_scopes) - set(simulation.oauth_scopes)
                if missing_scopes:
                    result = SimulationResult(
                        decision="BLOCKED",
                        matched_rule="oauth2_validation",
                        reason=f"Missing required OAuth2 scopes: {list(missing_scopes)}",
                        evaluation_details=evaluation_details
                    )
                    evaluation_logs.append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "rule_set_id": simulation.rule_set_id,
                        "client_ip": simulation.client_ip,
                        "result": result.dict()
                    })
                    return result
            
            evaluation_details.append("OAuth2 scope validation passed")
        
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
                    evaluation_details=evaluation_details
                )
                evaluation_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict()
                })
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
                    evaluation_details=evaluation_details
                )
                evaluation_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict()
                })
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
                    evaluation_details=evaluation_details
                )
                evaluation_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_set_id": simulation.rule_set_id,
                    "client_ip": simulation.client_ip,
                    "result": result.dict()
                })
                return result
            evaluation_details.append(path_reason)
        
        # If all checks pass, apply default action
        decision = "ALLOWED" if rule_set.default_action == "allow" else "BLOCKED"
        result = SimulationResult(
            decision=decision,
            matched_rule="default_action",
            reason=f"All rules passed, applying default action: {rule_set.default_action}",
            evaluation_details=evaluation_details
        )
        
        evaluation_logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "rule_set_id": simulation.rule_set_id,
            "client_ip": simulation.client_ip,
            "result": result.dict()
        })
        
        return result
    
    except Exception as e:
        logger.error(f"Error during simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/logs", response_model=List[Dict[str, Any]])
async def get_evaluation_logs(limit: int = 100):
    """Get recent evaluation logs"""
    return evaluation_logs[-limit:]

@app.delete("/logs")
async def clear_evaluation_logs():
    """Clear all evaluation logs"""
    global evaluation_logs
    evaluation_logs = []
    return {"status": "success", "message": "Evaluation logs cleared"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "rule_sets_count": len(rule_sets),
        "logs_count": len(evaluation_logs)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 