# streamlit_app.py
# Minimal single-file Streamlit conversion of your React OSCE app.
# - No external AI required (summary is generated locally).
# - Uses st.camera_input for snapshots (browser permission needed).
# - Saves/resumes sessions via JSON upload/download.

import streamlit as st
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
import time
import json
import urllib.parse

# -------------------------
# Data models / constants
# -------------------------

class RubricStatus:
    PENDING = "pending"
    MET = "met"
    NOT_MET = "not_met"

@dataclass
class RubricItem:
    id: str
    skill: str
    status: str = RubricStatus.PENDING

@dataclass
class TranscriptEntry:
    speaker: str  # 'user' | 'ai' | 'system' | 'summary'
    text: str
    ts: float

@dataclass
class UserDetails:
    name: str
    phone: str
    designation: str

# Example initial rubric — edit as needed
INITIAL_RUBRIC: List[RubricItem] = [
    RubricItem(id="hand_hygiene", skill="Hand hygiene"),
    RubricItem(id="introduce_self", skill="Introduces self to patient"),
    RubricItem(id="explain_procedure", skill="Explains procedure"),
    RubricItem(id="obtain_consent", skill="Obtains consent"),
    RubricItem(id="maintain_privacy", skill="Maintains privacy and dignity"),
]

# -------------------------
# Utility functions
# -------------------------

def now_ts() -> float:
    return time.time()

def save_session_to_bytes(session: Dict[str, Any]) -> bytes:
    return json.dumps(session, ensure_ascii=False, indent=2).encode("utf-8")

def load_session_from_bytes(b: bytes) -> Dict[str, Any]:
    return json.loads(b.decode("utf-8"))

def format_rubric_for_email(rubric: List[RubricItem]) -> str:
    return "\n".join(f"- {ri.skill}: {ri.status.replace('_', ' ').title()}" for ri in rubric)

def format_transcript_for_email(transcript: List[TranscriptEntry]) -> str:
    def who(e: TranscriptEntry):
        return "Student" if e.speaker == "user" else ("Examiner" if e.speaker == "ai" else e.speaker.capitalize())
    return "\n\n".join(f"{who(e)}: {e.text}" for e in transcript if e.speaker in ("user", "ai"))

def generate_local_summary(transcript: List[TranscriptEntry], rubric: List[RubricItem]) -> str:
    # Simple deterministic summary (no external API). You can later call your AI here.
    strengths = [r.skill for r in rubric if r.status == RubricStatus.MET]
    needs = [r.skill for r in rubric if r.status == RubricStatus.NOT_MET]

    # pick last few transcript lines from student to quote context
    student_lines = [t.text for t in transcript if t.speaker == "user"]
    recent = student_lines[-3:] if len(student_lines) >= 1 else []

    lines = []
    lines.append(f"Dear {st.session_state['user_details'].name if 'user_details' in st.session_state and st.session_state['user_details'] else 'Student'},")
    if strengths:
        lines.append("Strengths: " + ", ".join(strengths) + ".")
    if needs:
        lines.append("Areas for improvement: " + ", ".join(needs) + ".")
    if recent:
        lines.append("Notes from the session: " + " / ".join(recent))
    lines.append("Suggestions: Practice the identified areas; follow checklist steps clearly during the examination.")
    return "\n\n".join(lines)

# -------------------------
# Session state helpers
# -------------------------

if "initialized" not in st.session_state:
    st.session_state.initialized = True
    st.session_state.session_status = "idle"  # idle | connecting | live | ended | error
    st.session_state.transcript: List[TranscriptEntry] = []
    st.session_state.rubric: List[RubricItem] = [RubricItem(**asdict(i)) for i in INITIAL_RUBRIC]
    st.session_state.suggested_update: Optional[Dict[str, Any]] = None
    st.session_state.saved_session: Optional[Dict[str, Any]] = None
    st.session_state.start_time: Optional[float] = None
    st.session_state.duration_seconds: Optional[int] = None
    st.session_state.user_details: Optional[UserDetails] = None
    st.session_state.summary_text: Optional[str] = None

# -------------------------
# UI: sidebar for load/save and session info
# -------------------------
st.set_page_config(page_title="OSCE Live Skill Review", layout="wide")
st.sidebar.header("Session Controls")

uploaded = st.sidebar.file_uploader("Load saved session JSON", type=["json"])
if uploaded:
    try:
        data = load_session_from_bytes(uploaded.read())
        # basic restore
        st.session_state.transcript = [TranscriptEntry(**t) for t in data.get("transcript", [])]
        st.session_state.rubric = [RubricItem(**r) for r in data.get("rubric", [])]
        ud = data.get("user_details")
        if ud:
            st.session_state.user_details = UserDetails(**ud)
        st.success("Session loaded from file.")
        st.session_state.session_status = "ended"
    except Exception as e:
        st.error(f"Failed to load session: {e}")

if st.sidebar.button("Download session JSON"):
    session_dump = {
        "user_details": asdict(st.session_state.user_details) if st.session_state.user_details else None,
        "transcript": [asdict(t) for t in st.session_state.transcript],
        "rubric": [asdict(r) for r in st.session_state.rubric],
        "summary": st.session_state.summary_text,
    }
    st.sidebar.download_button("Download JSON", data=save_session_to_bytes(session_dump), file_name="osce_session.json")

if st.sidebar.button("Clear saved session in memory"):
    st.session_state.saved_session = None
    st.success("Cleared.")

st.sidebar.markdown("---")
st.sidebar.write("Session status:", st.session_state.session_status)
if st.session_state.start_time:
    elapsed = int(now_ts() - st.session_state.start_time)
    st.sidebar.write("Elapsed (s):", elapsed)

# -------------------------
# Welcome form / User details
# -------------------------
if not st.session_state.user_details:
    st.title("OSCE Live Skill Review — Welcome")
    with st.form("welcome_form"):
        name = st.text_input("Name")
        phone = st.text_input("Phone")
        designation = st.text_input("Designation")
        duration = st.number_input("Session duration (minutes)", min_value=1, max_value=180, value=10)
        submitted = st.form_submit_button("Start session setup")
        if submitted:
            if not name:
                st.warning("Please enter name.")
            else:
                st.session_state.user_details = UserDetails(name=name, phone=phone, designation=designation)
                st.session_state.duration_seconds = int(duration * 60)
                st.session_state.session_status = "idle"
                st.experimental_rerun()

# -------------------------
# Main app after welcome
# -------------------------
else:
    header_col, timer_col, action_col = st.columns([3,1,2])
    with header_col:
        st.title("OSCE Live Skill Review")
        st.write("AI-powered clinical skills examiner — local mode (no external AI).")
        st.write(f"Participant: **{st.session_state.user_details.name}** | {st.session_state.user_details.designation} | {st.session_state.user_details.phone}")

    with timer_col:
        if st.session_state.start_time and st.session_state.session_status == "live":
            elapsed = int(now_ts() - st.session_state.start_time)
        elif st.session_state.start_time:
            elapsed = int(now_ts() - st.session_state.start_time)
        else:
            elapsed = 0
        mins, secs = divmod(elapsed, 60)
        st.metric("Elapsed", f"{mins:02d}:{secs:02d}")

    with action_col:
        if st.session_state.session_status != "live":
            if st.button("Start New Session"):
                st.session_state.transcript = []
                st.session_state.rubric = [RubricItem(**asdict(i)) for i in INITIAL_RUBRIC]
                st.session_state.suggested_update = None
                st.session_state.summary_text = None
                st.session_state.start_time = now_ts()
                st.session_state.session_status = "live"
                st.experimental_rerun()
        else:
            if st.button("End Session"):
                st.session_state.session_status = "ended"
                st.session_state.summary_text = generate_local_summary(st.session_state.transcript, st.session_state.rubric)
                st.success("Session ended. Summary created.")

    st.markdown("---")

    # -------------------------
    # Left column: Video / Camera + transcript input
    # -------------------------
    left, right = st.columns([2,1])
    with left:
        st.subheader("Live View / Snapshots")
        camera_file = st.camera_input("Use camera to capture snapshots (click Capture)")
        if camera_file:
            # Save a note in transcript when a snapshot is taken
            t = TranscriptEntry(speaker="system", text=f"Snapshot captured (size {camera_file.size} bytes)", ts=now_ts())
            st.session_state.transcript.append(t)
            st.success("Snapshot saved to transcript.")

        st.subheader("Transcript")
        # Display transcript entries
        for entry in st.session_state.transcript:
            who = "Student" if entry.speaker == "user" else ("Examiner" if entry.speaker == "ai" else entry.speaker.capitalize())
            st.write(f"**{who}**: {entry.text}")

        with st.form("add_transcript"):
            col1, col2 = st.columns([2,6])
            speaker = col1.selectbox("Speaker", ["user", "ai"])
            text = col2.text_input("Transcript text")
            if st.form_submit_button("Add to transcript"):
                if text.strip():
                    st.session_state.transcript.append(TranscriptEntry(speaker=speaker, text=text.strip(), ts=now_ts()))
                    st.success("Added.")
                    st.experimental_rerun()

    # -------------------------
    # Right column: Rubric, suggestions, summary
    # -------------------------
    with right:
        st.subheader("Rubric")
        # show rubric table with selectboxes
        for idx, item in enumerate(st.session_state.rubric):
            cols = st.columns([3,2])
            cols[0].write(f"**{item.skill}**")
            new_status = cols[1].selectbox(
                "Status",
                options=[RubricStatus.PENDING, RubricStatus.MET, RubricStatus.NOT_MET],
                index=[RubricStatus.PENDING, RubricStatus.MET, RubricStatus.NOT_MET].index(item.status),
                key=f"rubric_{item.id}"
            )
            # update back into state
            st.session_state.rubric[idx].status = new_status

        st.markdown("---")
        st.subheader("Suggestions")
        # Simple simulation: allow user to add suggestion (this replaces your AI toolcall flow)
        with st.form("suggestion_form"):
            skill_choice = st.selectbox("Skill to suggest update for", options=[r.id for r in st.session_state.rubric])
            status_choice = st.selectbox("Suggested status", options=[RubricStatus.MET, RubricStatus.NOT_MET])
            reasoning = st.text_input("Reasoning for suggestion")
            if st.form_submit_button("Propose suggestion"):
                st.session_state.suggested_update = {"skillId": skill_choice, "status": status_choice, "reasoning": reasoning}
                st.success("Suggestion created. Await user confirmation.")

        if st.session_state.suggested_update:
            su = st.session_state.suggested_update
            st.write(f"Suggestion: set **{su['skillId']}** → **{su['status']}**")
            st.write(f"Reason: {su['reasoning'] or '-'}")
            col_a, col_b = st.columns(2)
            if col_a.button("Accept suggestion"):
                # apply suggestion
                for r in st.session_state.rubric:
                    if r.id == su["skillId"]:
                        r.status = su["status"]
                st.session_state.transcript.append(TranscriptEntry(speaker="system", text=f"Suggestion accepted for {su['skillId']}", ts=now_ts()))
                st.session_state.suggested_update = None
                st.success("Suggestion accepted.")
                st.experimental_rerun()
            if col_b.button("Reject suggestion"):
                st.session_state.transcript.append(TranscriptEntry(speaker="system", text=f"Suggestion rejected for {su['skillId']}", ts=now_ts()))
                st.session_state.suggested_update = None
                st.success("Suggestion rejected.")
                st.experimental_rerun()

        st.markdown("---")
        st.subheader("Session Summary")
        if st.session_state.session_status == "ended":
            if st.session_state.summary_text is None:
                st.session_state.summary_text = generate_local_summary(st.session_state.transcript, st.session_state.rubric)
            st.text_area("Summary", value=st.session_state.summary_text, height=200)
            # Email button via mailto
            subject = f"OSCE Skill Review Report for {st.session_state.user_details.name}"
            body = f"""Dear {st.session_state.user_details.name},

--- FEEDBACK SUMMARY ---
{st.session_state.summary_text}

--- FINAL RUBRIC CHECKLIST ---
{format_rubric_for_email(st.session_state.rubric)}

--- SESSION DETAILS ---
Name: {st.session_state.user_details.name}
Phone: {st.session_state.user_details.phone}
Designation: {st.session_state.user_details.designation}

--- FULL TRANSCRIPT ---
{format_transcript_for_email(st.session_state.transcript)}

Best regards,
The AI Clinical Examiner
"""
            mailto = "mailto:drashadobe@gmail.com?subject=" + urllib.parse.quote(subject) + "&body=" + urllib.parse.quote(body)
            st.markdown(f"[Open Email Client]({mailto})")

        else:
            st.info("Summary will be generated when session ends.")

    st.markdown("---")
    # Footer actions
    cols = st.columns(3)
    if cols[0].button("Save session to local JSON"):
        dump = {
            "user_details": asdict(st.session_state.user_details),
            "rubric": [asdict(r) for r in st.session_state.rubric],
            "transcript": [asdict(t) for t in st.session_state.transcript],
            "summary": st.session_state.summary_text,
        }
        st.download_button("Download session JSON", data=save_session_to_bytes(dump), file_name="osce_session.json")
    if cols[1].button("Clear transcript & rubric"):
        st.session_state.transcript = []
        st.session_state.rubric = [RubricItem(**asdict(i)) for i in INITIAL_RUBRIC]
        st.session_state.summary_text = None
        st.success("Cleared.")
    if cols[2].button("Mark all pending as not met"):
        for r in st.session_state.rubric:
            if r.status == RubricStatus.PENDING:
                r.status = RubricStatus.NOT_MET
        st.success("Updated pending items.")
