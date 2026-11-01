"""Dify Code node teaching example. Historical course table, not current policy.
Bind llm_result_str and income_status in the node's input panel.
Route status='review' to human review; never continue with a default CMS level.
Declare outputs: status/string, reason/string, cms_level/number,
monthly_budget/number, copay_rate/number. -1 means unavailable, never an amount.
"""
import json
import re


def main(llm_result_str: str, income_status: str) -> dict:
    try:
        clean = re.sub(r"^```(?:json)?\s*", "", llm_result_str.strip(), flags=re.I)
        clean = re.sub(r"\s*```$", "", clean)
        data = json.loads(clean)
        if not isinstance(data, dict):
            raise ValueError("Expected an object")
        level = data.get("cms_level")
        if isinstance(level, str) and re.fullmatch(r"[2-8]", level):
            level = int(level)
        if type(level) is not int or not 2 <= level <= 8:
            raise ValueError("cms_level must be an integer from 2 to 8")
        score = data.get("adl_score")
        if type(score) not in (int, float) or not 0 <= score <= 100:
            raise ValueError("Invalid adl_score")
        if type(data.get("is_dementia")) is not bool:
            raise ValueError("Invalid is_dementia")
        for key in ("major_problems", "suggested_needs"):
            value = data.get(key)
            if not isinstance(value, list) or not value or any(
                not isinstance(item, str) or not item.strip() for item in value
            ):
                raise ValueError("Invalid " + key)
        caps = {2: 10020, 3: 15460, 4: 18580, 5: 24100,
                6: 28070, 7: 32090, 8: 36180}
        rates = {"低收": 0, "中低收": 5, "一般戶": 16}
        if income_status not in rates:
            raise ValueError("Unknown income_status")
        return {"status": "ok", "reason": "Course example only; human review required",
                "cms_level": level, "monthly_budget": caps[level],
                "copay_rate": rates[income_status]}
    except (ValueError, TypeError, AttributeError) as exc:
        return {"status": "review", "reason": str(exc), "cms_level": -1,
                "monthly_budget": -1, "copay_rate": -1}
