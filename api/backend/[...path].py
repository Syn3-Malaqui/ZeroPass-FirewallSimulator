import os
import json
import requests
from urllib.parse import urljoin

def handler(event, context):
    """
    Vercel serverless function that proxies requests to the FastAPI backend
    """
    # Get the path parameters from the event
    path = event.get('path', '').replace('/api/backend/', '')
    
    # Get the HTTP method
    method = event.get('httpMethod', 'GET')
    
    # Get query parameters
    query_string = event.get('queryStringParameters', {})
    
    # Get headers (excluding host which will be set by requests)
    headers = event.get('headers', {})
    if 'host' in headers:
        del headers['host']
    
    # Get request body
    body = event.get('body', None)
    
    # Parse the backend URL from environment variable
    backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8000')
    
    # Build the full URL
    full_url = urljoin(backend_url, path)
    
    try:
        # Send the request to the backend
        response = requests.request(
            method=method,
            url=full_url,
            params=query_string,
            headers=headers,
            data=body
        )
        
        # Return the response
        return {
            'statusCode': response.status_code,
            'headers': dict(response.headers),
            'body': response.text
        }
    except Exception as e:
        # Return error response
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': f'Error proxying request: {str(e)}'
            })
        } 