#!/usr/bin/env python3
"""
Test script for the comprehensive report generation endpoint.
"""

import json
import requests
from datetime import datetime

def test_comprehensive_report():
    """Test the comprehensive report generation endpoint."""
    
    # Sample data for testing
    test_data = {
        "nodes": [
            {
                "id": "node1",
                "text": "Climate change is real and caused by human activities",
                "type": "factual",
                "evidenceIds": ["ev1", "ev2"]
            },
            {
                "id": "node2", 
                "text": "We should take action to reduce carbon emissions",
                "type": "policy",
                "evidenceIds": ["ev3"]
            }
        ],
        "edges": [
            {
                "source": "node1",
                "target": "node2", 
                "weight": 0.8
            }
        ],
        "evidence": [
            {
                "id": "ev1",
                "title": "IPCC Report 2021",
                "excerpt": "Human influence has warmed the climate at a rate unprecedented in at least the last 2000 years.",
                "confidence": 0.9
            },
            {
                "id": "ev2",
                "title": "NASA Climate Data",
                "excerpt": "Global temperature rise shows clear correlation with CO2 emissions.",
                "confidence": 0.85
            },
            {
                "id": "ev3",
                "title": "Economic Analysis",
                "excerpt": "Cost of inaction exceeds cost of climate action.",
                "confidence": 0.7
            }
        ],
        "supportingDocuments": [
            {
                "id": "doc1",
                "name": "IPCC_Report_2021.pdf",
                "type": "pdf",
                "url": "https://example.com/ipcc-report.pdf"
            }
        ],
        "evidence_evaluation_results": {
            "results": [
                {
                    "node_id": "node1",
                    "evidence_id": "ev1", 
                    "evaluation": "yes",
                    "reasoning": "Strong scientific evidence supports this claim",
                    "confidence": 0.9
                }
            ]
        },
        "edge_validation_results": {
            "results": [
                {
                    "edge_id": "edge1",
                    "evaluation": "support",
                    "reasoning": "The factual claim about climate change supports the policy recommendation",
                    "confidence": 0.8
                }
            ]
        },
        "assumptions_results": {
            "results": [
                {
                    "edge_id": "edge1",
                    "assumptions": [
                        {
                            "assumption_text": "Policy action is feasible and effective",
                            "reasoning": "Implicit assumption that policy can address the problem",
                            "importance": 0.7,
                            "confidence": 0.6
                        }
                    ]
                }
            ]
        },
        "critique_results": {
            "argument_flaws": [],
            "pattern_matches": [],
            "overall_assessment": "Strong argument with good evidence",
            "recommendations": ["Consider counter-arguments", "Add more policy details"]
        },
        "graph_title": "Climate Change Argument",
        "analyst_name": "Test Analyst",
        "analyst_contact": "test@intelliproof.com"
    }
    
    print("Testing comprehensive report generation...")
    print(f"Test data prepared with {len(test_data['nodes'])} nodes, {len(test_data['edges'])} edges, {len(test_data['evidence'])} evidence items")
    
    try:
        # Make request to the endpoint
        response = requests.post(
            "http://localhost:8000/api/ai/generate-comprehensive-report",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Report generation successful!")
            print(f"Cover page: {result.get('cover_page', 'N/A')[:100]}...")
            print(f"Executive summary: {result.get('executive_summary', 'N/A')[:100]}...")
            print(f"Report metadata: {result.get('report_metadata', {})}")
            return True
        else:
            print(f"❌ Report generation failed with status {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False

if __name__ == "__main__":
    test_comprehensive_report() 