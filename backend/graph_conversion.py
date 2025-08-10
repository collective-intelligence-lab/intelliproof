import json
import ast

def convert_graph_format(graph) : 
    """
    Converts a graph represented as a string dictionary to a a format suitable for our tool
    """
    converted = ast.literal_eval(graph) # Convert string to dictionary

    for edge in converted['edges']:
        edge["source"] = edge.pop("from") # Rename 'from' to 'source'
        edge["target"] = edge.pop("to")

        if edge["relation"] == "support" : 
            del edge["relation"] # Remove 'support' relation
            edge["weight"] = 0.75 # Assign a default weight for support edges
        elif edge["relation"] == "attack" : 
            del edge["relation"] # Remove 'attack' relation
            edge["weight"] = -0.75
        
    converted["evidence"] = []
    
    return converted


if __name__ == "__main__":
    # example 

    input = "{'nodes': [{'id': 1, 'text': 'Should the existing structure of standardized testing undergo a transformation that shifts its focus away from the rigid application of uniform metrics, there is a substantial possibility that educational equity could flourish. This potential enhancement in equity would arise as students hailing from a multitude of diverse backgrounds would no longer be unfairly hindered by a system that imposes a singular, one-size-fits-all approach upon them.', 'type': 'factual'}, {'id': 2, 'text': 'Through the strategic emphasis on personalized approaches to education, learners who had previously encountered difficulties when assessed by conventional, standardized measures of academic performance can experience significant improvements, thereby contributing to the enhancement of the broader educational landscape and outcomes.', 'type': 'factual'}, {'id': 3, 'text': 'If we continue down the current path without reform, the undue stress and pressure associated with high-stakes testing could persist, potentially escalating mental health challenges among students and educators.', 'type': 'value'}, {'id': 4, 'text': 'This hypothetical chain of events suggests that without change, the focus on test preparation will continue to narrow the curriculum, stifling creativity and critical thinking.', 'type': 'policy'}], 'edges': [{'from': 1, 'to': 2, 'relation': 'support'}, {'from': 3, 'to': 4, 'relation': 'support'}, {'from': 3, 'to': 2, 'relation': 'attack'}, {'from': 4, 'to': 1, 'relation': 'attack'}]}"

    print(convert_graph_format(input))
