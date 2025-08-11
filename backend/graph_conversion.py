import json
import ast
import string
import random

def generate_random_string(length):
    """
    Generates a random string of a given length, composed of
    ASCII letters (uppercase and lowercase) and digits.
    """
    characters = string.ascii_letters + string.digits
    random_string = ''.join(random.choices(characters, k=length))
    return random_string

def convert_graph_format(graph) : 
    """
    Converts a graph represented as a string dictionary to a a format suitable for our tool
    """
    converted = ast.literal_eval(graph) # Convert string to dictionary

    for edge in converted['edges']:
        edge["source"] = edge.pop("from") # Rename 'from' to 'source'
        edge["target"] = edge.pop("to")

        edge["source"] = str(edge["source"])
        edge["target"] = str(edge["target"])

        # Force source to have lower ID than target
        if int(edge["source"]) > int(edge["target"]):
            # Swap them
            edge["source"], edge["target"] = edge["target"], edge["source"]

        if edge["relation"] == "support" : 
            del edge["relation"] # Remove 'support' relation
            edge["weight"] = 0.75 # Assign a default weight for support edges
        elif edge["relation"] == "attack" : 
            del edge["relation"] # Remove 'attack' relation
            edge["weight"] = -0.75
        edge["id"] = generate_random_string(24)
    
    
    for i, node in enumerate(converted['nodes']):
        node["id"] = str(node["id"])
        node["author"] = "LLM"
        node["belief"] = 0.5
        node["credibilityScore"] = 0
         # Better positioning logic for a well-spaced graph
        if i == 0:
            # Main claim centered on the left
            node["position"] = {"x": 150, "y": 400}
        else:
            # Supporting claims in a more spread out arrangement
            # Calculate position based on index for better distribution
            row = (i - 1) // 3  # 3 claims per row
            col = (i - 1) % 3   # Column within the row
            
            # Start from x=500, y=200 and space out nicely
            x_pos = 500 + (col * 300)  # 300px spacing between columns
            y_pos = 200 + (row * 250)  # 250px spacing between rows
            
            node["position"] = {"x": x_pos, "y": y_pos}
        node["created_on"] = "2025-01-01T00:00:00Z"
        node["evidenceIds"] = []
        
    converted["evidence"] = []
    
    return converted


if __name__ == "__main__":
    # example 

    input = "{'nodes': [{'id': 1, 'text': 'Should the existing structure of standardized testing undergo a transformation that shifts its focus away from the rigid application of uniform metrics, there is a substantial possibility that educational equity could flourish. This potential enhancement in equity would arise as students hailing from a multitude of diverse backgrounds would no longer be unfairly hindered by a system that imposes a singular, one-size-fits-all approach upon them.', 'type': 'factual'}, {'id': 2, 'text': 'Through the strategic emphasis on personalized approaches to education, learners who had previously encountered difficulties when assessed by conventional, standardized measures of academic performance can experience significant improvements, thereby contributing to the enhancement of the broader educational landscape and outcomes.', 'type': 'factual'}, {'id': 3, 'text': 'If we continue down the current path without reform, the undue stress and pressure associated with high-stakes testing could persist, potentially escalating mental health challenges among students and educators.', 'type': 'value'}, {'id': 4, 'text': 'This hypothetical chain of events suggests that without change, the focus on test preparation will continue to narrow the curriculum, stifling creativity and critical thinking.', 'type': 'policy'}], 'edges': [{'from': 1, 'to': 2, 'relation': 'support'}, {'from': 3, 'to': 4, 'relation': 'support'}, {'from': 3, 'to': 2, 'relation': 'attack'}, {'from': 4, 'to': 1, 'relation': 'attack'}]}"

    print(convert_graph_format(input))
