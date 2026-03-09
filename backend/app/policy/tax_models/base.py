"""
Base class for financial policy engines.
"""


class PolicyEngine:

    def evaluate(self, *args, **kwargs):
        raise NotImplementedError("Policy engines must implement evaluate()")