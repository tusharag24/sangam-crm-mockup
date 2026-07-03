#!/bin/bash
python3 fix_index.py
python3 restore_helpers.py
python3 implement_tracker.py
python3 inject_gen_quote.py
python3 inject_missing_buttons.py
python3 inject_remaining.py
python3 patch_milestone_ui.py
python3 apply_milestone_fix.py
python3 patch_pending_state.py
python3 patch_policy_decision.py
python3 patch_decision_ui.py
python3 patch_policy_issued_1.py
python3 patch_hl_block.py
