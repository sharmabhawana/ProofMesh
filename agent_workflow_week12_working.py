import os

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

from provenance_logger import ProvenanceLogger


# ---------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------

load_dotenv()

provenance_logger = ProvenanceLogger()


# ---------------------------------------------------------
# Controlled ProofMesh Knowledge Tool
# ---------------------------------------------------------

@tool
def knowledge_lookup(topic: str) -> str:
    """
    Retrieve evidence from the controlled ProofMesh
    knowledge source.
    """

    knowledge_base = {
        "provenance": (
            "Provenance is the recorded history of the origin, "
            "processing, and transformation of information."
        ),

        "ai agent": (
            "An AI agent is a software system that performs tasks "
            "using models, tools, and external information."
        ),

        "trustworthy ai": (
            "Trustworthy AI focuses on transparency, reliability, "
            "security, and accountability."
        ),
    }

    return knowledge_base.get(
        topic.lower(),
        "No information was found in the controlled knowledge source.",
    )


# ---------------------------------------------------------
# Extract clean text from Gemini response
# ---------------------------------------------------------

def extract_text(response):

    content = response.content

    if isinstance(content, list):

        text_parts = []

        for item in content:

            if isinstance(item, dict):

                if item.get("type") == "text":
                    text_parts.append(
                        item.get("text", "")
                    )

            elif isinstance(item, str):
                text_parts.append(item)

        return "\n".join(text_parts)

    return str(content)


# ---------------------------------------------------------
# Main ProofMesh Workflow
# ---------------------------------------------------------

def run_workflow(user_request: str):

    print("\n========================================")
    print("ProofMesh - Week 2")
    print("Middleware & Provenance Demonstration")
    print("========================================")

    print("\nUser Request:")
    print(user_request)

    # -----------------------------------------------------
    # Check Gemini API key
    # -----------------------------------------------------

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:

        raise RuntimeError(
            "GEMINI_API_KEY was not found.\n"
            "Create a .env file and add:\n"
            "GEMINI_API_KEY=your_api_key"
        )

    # -----------------------------------------------------
    # Gemini model configuration
    # -----------------------------------------------------

    model_name = "gemini-3.6-flash"

    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        thinking_level="minimal",
    )

    # -----------------------------------------------------
    # 1. Record MODEL DETAILS
    # -----------------------------------------------------

    provenance_logger._record_event(

        event_type="MODEL_DETAILS",

        metadata={
            "model": model_name,
            "provider": "Google Gemini",
            "integration": "LangChain",
            "environment": "ProofMesh",
        },
    )

    # -----------------------------------------------------
    # 2. Record API INPUT
    # -----------------------------------------------------

    provenance_logger._record_event(

        event_type="LLM_CALL_START",

        input_data=user_request,

        metadata={
            "model": model_name,
            "provider": "Google Gemini",
            "request_type": "External LLM API Request",
        },
    )

    # -----------------------------------------------------
    # 3. Execute actual LangChain TOOL
    # -----------------------------------------------------

    print("\n========================================")
    print("Executing LangChain Tool")
    print("========================================")

    print("\nTool: knowledge_lookup")
    print("Input: provenance")

    evidence = knowledge_lookup.invoke(

        {
            "topic": "provenance"
        },

        config={
            "callbacks": [
                provenance_logger
            ]
        },
    )

    # -----------------------------------------------------
    # 4. Record EVIDENCE
    # -----------------------------------------------------

    provenance_logger._record_event(

        event_type="EVIDENCE_CAPTURED",

        input_data={
            "topic": "provenance"
        },

        output_data=evidence,

        tool="knowledge_lookup",

        metadata={
            "source": "Controlled ProofMesh Knowledge Base",
            "status": "CAPTURED",
        },
    )

    print("\nEvidence Retrieved:")
    print("----------------------------------------")
    print(evidence)
    print("----------------------------------------")

    # -----------------------------------------------------
    # 5. Call REAL external Gemini API
    # -----------------------------------------------------

    print("\n========================================")
    print("Calling REAL external Gemini API")
    print("========================================")

    response = llm.invoke(
        [
            HumanMessage(
                content=user_request
            )
        ]
    )

    # Extract clean Gemini response
    llm_output = extract_text(response)

    # -----------------------------------------------------
    # 6. Record LLM RESPONSE
    # -----------------------------------------------------

    provenance_logger._record_event(

        event_type="LLM_CALL_END",

        input_data=user_request,

        output_data=llm_output,

        metadata={
            "model": model_name,
            "provider": "Google Gemini",
            "status": "SUCCESS",
            "response_type": "LLM Generated Text",
        },
    )

    print("\nReal Gemini Response:")
    print("----------------------------------------")
    print(llm_output)
    print("----------------------------------------")

    # -----------------------------------------------------
    # 7. Record INTERMEDIATE DECISION
    # -----------------------------------------------------

    intermediate_decision = (

        "The controlled knowledge tool returned "
        "observable evidence, and the external Gemini "
        "LLM successfully processed the user request. "
        "The evidence and model response were captured "
        "for provenance tracking."
    )

    provenance_logger._record_event(

        event_type="INTERMEDIATE_DECISION",

        input_data={
            "evidence": evidence,
            "llm_response": llm_output,
        },

        output_data=intermediate_decision,

        tool="knowledge_lookup",

        metadata={
            "model": model_name,
            "provider": "Google Gemini",
            "stage": "Evidence and LLM Response Evaluation",
            "status": "RECORDED",
        },
    )

    # -----------------------------------------------------
    # 8. Record FINAL DECISION
    # -----------------------------------------------------

    final_decision = (

        "The user request was processed using a real "
        "external Gemini LLM through LangChain. The "
        "ProofMesh provenance middleware recorded model "
        "details, API interaction, tool execution, "
        "evidence, intermediate workflow state, and "
        "the final decision."
    )

    provenance_logger._record_event(

        event_type="DECISION",

        input_data={
            "evidence": evidence,
            "llm_response": llm_output,
        },

        output_data=final_decision,

        metadata={
            "model": model_name,
            "provider": "Google Gemini",
            "status": "RECORDED",
        },
    )

    print("\nFinal Decision:")
    print("----------------------------------------")
    print(final_decision)
    print("----------------------------------------")

    # -----------------------------------------------------
    # Display all provenance events
    # -----------------------------------------------------

    print("\n========================================")
    print("Provenance Events")
    print("========================================")

    for event in provenance_logger.events:

        print(
            f"{event['event_type']} | "
            f"{event['event_id']}"
        )

    print("\n========================================")
    print("Provenance logging completed successfully.")
    print("========================================")


# ---------------------------------------------------------
# Program Entry Point
# ---------------------------------------------------------

if __name__ == "__main__":

    request = (

        "Explain how provenance improves trust "
        "in AI-agent workflows. "
        "Give exactly 3 short numbered points. "
        "Each point must contain one sentence only. "
        "Keep the total answer under 50 words. "
        "Do not provide private chain-of-thought."
    )

    run_workflow(request)