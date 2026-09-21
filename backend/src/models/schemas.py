from pydantic import BaseModel


class DispatcherTurn(BaseModel):
    message: str
    isFinished: bool
    isPrankCall: bool
