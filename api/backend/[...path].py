from http.client import HTTPConnection
from urllib.parse import urlparse
import os
import json

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
    
    # Get headers (excluding host which will be set by the http client)
    headers = event.get('headers', {})
    if 'host' in headers:
        del headers['host']
    
    # Get request body
    body = event.get('body', None)
    
    # Parse the backend URL from environment variable
    backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8000')
    parsed_url = urlparse(backend_url)
    
    # Create a connection to the backend
    conn = HTTPConnection(parsed_url.netloc)
    
    # Build the path with query parameters
    if query_string:
        query_parts = []
        for key, value in query_string.items():
            query_parts.append(f"{key}={value}")
        full_path = f"{parsed_url.path}/{path}?{'&'.join(query_parts)}"
    else:
        full_path = f"{parsed_url.path}/{path}"
    
    # Send the request to the backend
    conn.request(
        method=method,
        url=full_path,
        body=body,
        headers=headers
    )
    
    # Get the response from the backend
    response = conn.getresponse()
    
    # Read the response data
    data = response.read().decode()
    
    # Get the response headers
    response_headers = {k: v for k, v in response.getheaders()}
    
    # Close the connection
    conn.close()
    
    # Return the response
    return {
        'statusCode': response.status,
        'headers': response_headers,
        'body': data
    } 