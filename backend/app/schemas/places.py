from typing import Literal

from pydantic import BaseModel


class AutocompleteRequest(BaseModel):
    query: str
    kind: Literal['origin', 'destination'] = 'origin'

