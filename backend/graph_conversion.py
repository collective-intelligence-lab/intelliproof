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
    
    return converted


if __name__ == "__main__":
    # example 

    input = "{'nodes': [{'id': 1, 'text': 'Transforming standardized testing to abandon its obsession with uniform metrics would revolutionize educational equity, unleashing an unprecedented era of academic flourishing for students from diverse backgrounds, who would no longer be shackled by the suffocating chains of a one-size-fits-all system.', 'type': 'factual'}, {'id': 2, 'text': 'By embracing the unparalleled power of individualized learning, students who once floundered in the rigid grip of standardized metrics could soar to unimaginable heights, revolutionizing the very fabric of educational success.', 'type': 'factual'}, {'id': 3, 'text': 'If we continue down the current path without reform, the undue stress and pressure associated with high-stakes testing could persist, potentially escalating mental health challenges among students and educators.', 'type': 'value'}, {'id': 4, 'text': 'This hypothetical chain of events suggests that without change, the focus on test preparation will continue to narrow the curriculum, stifling creativity and critical thinking.', 'type': 'policy'}], 'edges': [{'from': 1, 'to': 2, 'relation': 'support'}, {'from': 3, 'to': 4, 'relation': 'support'}, {'from': 3, 'to': 2, 'relation': 'attack'}, {'from': 4, 'to': 1, 'relation': 'attack'}]}"

    convert_graph_format(input)
