from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Single shared limiter instance.
#
# It lives here rather than in main.py because route modules need to
# import it for their @limiter.limit decorators, and main.py imports
# those route modules — importing back into main would be circular.
#
# SlowAPI resolves limits at request time via request.app.state.limiter,
# so this object and the one registered on the app MUST be the same
# instance or the decorators silently do nothing.

limiter = Limiter(key_func=get_remote_address)