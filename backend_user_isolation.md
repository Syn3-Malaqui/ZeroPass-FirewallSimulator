# Backend User Isolation Implementation

## Overview
This document outlines the changes needed in the backend to support user session isolation. Each user gets their own private workspace with isolated rules and logs.

## Required Backend Changes

### 1. Session Middleware
```python
# Add to main.py or create middleware.py
from fastapi import Header, Depends
from typing import Optional

async def get_user_session(x_user_session: Optional[str] = Header(None)) -> str:
    """Extract user session ID from request headers"""
    if not x_user_session:
        # Return a default session for backward compatibility
        return "default_session"
    return x_user_session

# Usage in endpoints
@app.get("/rules")
async def get_rules(user_session: str = Depends(get_user_session)):
    # Filter rules by user_session
    pass
```

### 2. Database Schema Updates
```sql
-- Add user_session column to existing tables
ALTER TABLE firewall_rules ADD COLUMN user_session VARCHAR(255) NOT NULL DEFAULT 'default_session';
ALTER TABLE evaluation_logs ADD COLUMN user_session VARCHAR(255) NOT NULL DEFAULT 'default_session';
ALTER TABLE simulations ADD COLUMN user_session VARCHAR(255) NOT NULL DEFAULT 'default_session';

-- Add indexes for performance
CREATE INDEX idx_firewall_rules_user_session ON firewall_rules(user_session);
CREATE INDEX idx_evaluation_logs_user_session ON evaluation_logs(user_session);
CREATE INDEX idx_simulations_user_session ON simulations(user_session);
```

### 3. Updated Endpoints

#### Rules Endpoints
```python
@app.get("/rules")
async def get_rules(user_session: str = Depends(get_user_session)):
    """Get all rule sets for a specific user session"""
    # Filter by user_session
    rules = db.query(FirewallRule).filter(
        FirewallRule.user_session == user_session
    ).all()
    return rules

@app.post("/rules")
async def create_or_update_rule(
    rule_set: FirewallRuleSet, 
    user_session: str = Depends(get_user_session)
):
    """Create or update a rule set for a specific user session"""
    # Add user_session to the rule_set before saving
    rule_data = rule_set.dict()
    rule_data['user_session'] = user_session
    # Save to database
    return {"status": "success", "rule_set_id": rule_set.id}

@app.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str, 
    user_session: str = Depends(get_user_session)
):
    """Delete a rule set for a specific user session"""
    # Ensure user can only delete their own rules
    rule = db.query(FirewallRule).filter(
        FirewallRule.id == rule_id,
        FirewallRule.user_session == user_session
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    db.delete(rule)
    db.commit()
    return {"status": "success", "message": "Rule deleted"}
```

#### Simulation Endpoints
```python
@app.post("/simulate")
async def simulate_request(
    request: SimulationRequest, 
    user_session: str = Depends(get_user_session)
):
    """Simulate a request against user's rule sets"""
    # Only check rules belonging to this user session
    rule_set = db.query(FirewallRule).filter(
        FirewallRule.id == request.rule_set_id,
        FirewallRule.user_session == user_session
    ).first()
    
    if not rule_set:
        raise HTTPException(status_code=404, detail="Rule set not found")
    
    # Process simulation
    result = process_simulation(request, rule_set)
    
    # Log with user session
    log_entry = EvaluationLog(
        user_session=user_session,
        rule_set_id=request.rule_set_id,
        client_ip=request.client_ip,
        result=result,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
    
    return result
```

#### Logs Endpoints
```python
@app.get("/logs")
async def get_logs(
    limit: int = 100, 
    user_session: str = Depends(get_user_session)
):
    """Get evaluation logs for a specific user session"""
    logs = db.query(EvaluationLog).filter(
        EvaluationLog.user_session == user_session
    ).order_by(EvaluationLog.timestamp.desc()).limit(limit).all()
    
    return logs

@app.delete("/logs")
async def clear_logs(user_session: str = Depends(get_user_session)):
    """Clear evaluation logs for a specific user session"""
    db.query(EvaluationLog).filter(
        EvaluationLog.user_session == user_session
    ).delete()
    db.commit()
    
    return {"status": "success", "message": "Logs cleared"}
```

#### User Stats Endpoints
```python
@app.get("/user/stats")
async def get_user_stats(user_session: str = Depends(get_user_session)):
    """Get statistics for a specific user session"""
    rule_count = db.query(FirewallRule).filter(
        FirewallRule.user_session == user_session
    ).count()
    
    simulation_count = db.query(EvaluationLog).filter(
        EvaluationLog.user_session == user_session
    ).count()
    
    log_count = simulation_count  # Same as simulation count
    
    return {
        "rule_sets": rule_count,
        "simulations": simulation_count,
        "logs": log_count
    }

@app.delete("/user/data")
async def clear_user_data(user_session: str = Depends(get_user_session)):
    """Clear all data for a specific user session"""
    # Clear logs
    db.query(EvaluationLog).filter(
        EvaluationLog.user_session == user_session
    ).delete()
    
    # Optionally clear rules (be careful with this)
    # db.query(FirewallRule).filter(
    #     FirewallRule.user_session == user_session
    # ).delete()
    
    db.commit()
    return {"status": "success", "message": "User data cleared"}
```

### 4. Data Migration Script
```python
# migrate_user_sessions.py
def migrate_existing_data():
    """Migrate existing data to use default user session"""
    
    # Update rules without user_session
    db.execute("""
        UPDATE firewall_rules 
        SET user_session = 'default_session' 
        WHERE user_session IS NULL OR user_session = ''
    """)
    
    # Update logs without user_session
    db.execute("""
        UPDATE evaluation_logs 
        SET user_session = 'default_session' 
        WHERE user_session IS NULL OR user_session = ''
    """)
    
    db.commit()
    print("Migration completed successfully")

if __name__ == "__main__":
    migrate_existing_data()
```

### 5. Testing User Isolation
```python
# test_user_isolation.py
import requests

def test_user_isolation():
    base_url = "http://localhost:8000"
    
    # Test with two different sessions
    session_1 = "zp_test_session_1"
    session_2 = "zp_test_session_2"
    
    headers_1 = {"X-User-Session": session_1}
    headers_2 = {"X-User-Session": session_2}
    
    # Create rule for session 1
    rule_1 = {
        "id": "test_rule_1",
        "name": "Session 1 Rule",
        "default_action": "allow"
    }
    response = requests.post(f"{base_url}/rules", json=rule_1, headers=headers_1)
    assert response.status_code == 200
    
    # Create rule for session 2
    rule_2 = {
        "id": "test_rule_2", 
        "name": "Session 2 Rule",
        "default_action": "block"
    }
    response = requests.post(f"{base_url}/rules", json=rule_2, headers=headers_2)
    assert response.status_code == 200
    
    # Session 1 should only see their rule
    response = requests.get(f"{base_url}/rules", headers=headers_1)
    rules_1 = response.json()
    assert len(rules_1) == 1
    assert rules_1[0]["id"] == "test_rule_1"
    
    # Session 2 should only see their rule
    response = requests.get(f"{base_url}/rules", headers=headers_2)
    rules_2 = response.json()
    assert len(rules_2) == 1
    assert rules_2[0]["id"] == "test_rule_2"
    
    print("User isolation test passed!")

if __name__ == "__main__":
    test_user_isolation()
```

## Deployment Notes

1. **Backup Database**: Before applying schema changes, backup your database
2. **Run Migration**: Execute the migration script to update existing data
3. **Update Backend**: Deploy the updated backend code with session support
4. **Test Isolation**: Run isolation tests to ensure proper user separation
5. **Monitor Performance**: Watch for any performance impacts from additional filtering

## Security Considerations

1. **Session Validation**: Consider adding session validation/authentication
2. **Rate Limiting**: Implement per-session rate limiting
3. **Data Cleanup**: Implement automatic cleanup of old sessions
4. **Access Control**: Ensure users can only access their own data

## Cache Management

The frontend now includes automatic cache clearing on refresh and session reset to prevent backend overload. The cache is cleared:
- When a new session is created
- Every 5 minutes automatically
- When user manually clears cache
- When session is reset 