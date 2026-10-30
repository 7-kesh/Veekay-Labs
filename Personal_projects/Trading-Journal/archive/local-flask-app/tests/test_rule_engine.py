import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import rule_engine


def by_check(flags, name):
    return next(f for f in flags if f["check"] == name)


def test_size_pass_and_fail():
    ok = rule_engine.check_size({"entry_price": "8.50", "stop": "8.10", "shares": "50"}, 20)
    assert ok["status"] == "pass"
    bad = rule_engine.check_size({"entry_price": "8.50", "stop": "8.10", "shares": "100"}, 20)
    assert bad["status"] == "fail"


def test_size_insufficient_evidence_when_missing():
    r = rule_engine.check_size({"entry_price": "8.50", "stop": "", "shares": "50"}, 20)
    assert r["status"] == "insufficient_evidence"


def test_stop_recorded():
    assert rule_engine.check_stop_recorded({"stop": "8.10"})["status"] == "pass"
    assert rule_engine.check_stop_recorded({"stop": ""})["status"] == "fail"


def test_5min_reset():
    assert rule_engine.check_5min_reset({"entry_time": "09:30"}, None)["status"] == "pass"
    assert rule_engine.check_5min_reset({"entry_time": "09:33"}, "09:30")["status"] == "fail"
    assert rule_engine.check_5min_reset({"entry_time": "09:36"}, "09:30")["status"] == "pass"


def test_category_consistency():
    assert rule_engine.check_category_consistency({"category": "A", "violations": []})["status"] == "pass"
    assert rule_engine.check_category_consistency({"category": "A", "violations": ["Extended / chase"]})["status"] == "fail"
    assert rule_engine.check_category_consistency({"category": "B", "violations": []})["status"] == "fail"
    assert rule_engine.check_category_consistency({"category": "B", "violations": ["Extended / chase"]})["status"] == "pass"


def test_run_returns_all_four():
    flags = rule_engine.run({"entry_price": "8.50", "stop": "8.10", "shares": "50",
                              "entry_time": "09:30", "category": "A", "violations": []}, None, 20)
    assert {f["check"] for f in flags} == {"size", "stop_recorded", "process_5min_reset", "category_consistency"}
    assert all(f["status"] == "pass" for f in flags)
