import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langchain_core.callbacks import BaseCallbackHandler


LOG_FILE = Path("provenance_logs.json")


class ProvenanceLogger(BaseCallbackHandler):
    """
    ProofMesh provenance logger.

    Captures observable AI-agent workflow events such as:
    - model information
    - LLM request
    - LLM response
    - tool interactions
    - evidence
    - intermediate workflow states
    - final decisions
    """

    def __init__(self):
        super().__init__()

        self.events = []
        self.active_tools = {}

    # --------------------------------------------------
    # EVENT RECORDING
    # --------------------------------------------------

    def _record_event(
        self,
        event_type: str,
        input_data: Any = None,
        output_data: Any = None,
        tool: str | None = None,
        metadata: dict | None = None,
    ):
        metadata = metadata or {}

        event = {
            "event_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "agent": "ProofMesh-Agent",

            # Use the actual model when supplied.
            "model": metadata.get("model"),

            "tool": tool,

            "input": self._serialize(input_data),

            "output": self._serialize(output_data),

            "metadata": metadata,
        }

        self.events.append(event)

        self._save()

        print(
            f"[PROVENANCE] {event_type} | "
            f"Event ID: {event['event_id']}"
        )

    # --------------------------------------------------
    # SERIALIZATION
    # --------------------------------------------------

    @staticmethod
    def _serialize(value: Any):

        if value is None:
            return None

        if isinstance(value, (str, int, float, bool)):
            return value

        try:
            json.dumps(value)
            return value

        except TypeError:
            return str(value)

    # --------------------------------------------------
    # SAVE PROVENANCE LOG
    # --------------------------------------------------

    def _save(self):

        with LOG_FILE.open(
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                self.events,
                file,
                indent=4,
                ensure_ascii=False,
            )

    # --------------------------------------------------
    # LANGCHAIN TOOL START
    # --------------------------------------------------

    def on_tool_start(
        self,
        serialized: dict,
        input_str: str,
        **kwargs,
    ):

        tool_name = serialized.get(
            "name",
            "UnknownTool"
        )

        run_id = str(
            kwargs.get("run_id")
        )

        self.active_tools[run_id] = tool_name

        self._record_event(
            event_type="TOOL_START",

            input_data=input_str,

            tool=tool_name,

            metadata={
                "run_id": run_id,
            },
        )

    # --------------------------------------------------
    # LANGCHAIN TOOL END
    # --------------------------------------------------

    def on_tool_end(
        self,
        output: Any,
        **kwargs,
    ):

        run_id = str(
            kwargs.get("run_id")
        )

        tool_name = self.active_tools.get(
            run_id
        )

        self._record_event(
            event_type="TOOL_END",

            output_data=output,

            tool=tool_name,

            metadata={
                "run_id": run_id,
            },
        )

        self.active_tools.pop(
            run_id,
            None
        )

    # --------------------------------------------------
    # LANGCHAIN TOOL ERROR
    # --------------------------------------------------

    def on_tool_error(
        self,
        error: BaseException,
        **kwargs,
    ):

        run_id = str(
            kwargs.get("run_id")
        )

        tool_name = self.active_tools.get(
            run_id
        )

        self._record_event(
            event_type="TOOL_ERROR",

            output_data=str(error),

            tool=tool_name,

            metadata={
                "run_id": run_id,
            },
        )

        self.active_tools.pop(
            run_id,
            None
        )