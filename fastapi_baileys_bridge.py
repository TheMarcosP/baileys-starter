from fastapi import FastAPI, Request
from pydantic import BaseModel
import httpx

app = FastAPI()

class SendMessageRequest(BaseModel):
    jid: str
    text: str

@app.post("/whatsapp/message")
async def receive_message(request: Request):
    data = await request.json()
    print("Received WhatsApp message:", data)

    # 
    return {"status": "received"}

@app.post("/send-whatsapp")
async def send_whatsapp(req: SendMessageRequest):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "http://localhost:8081/api/send-message",
            json={"jid": req.jid, "text": req.text}
        )
        return resp.json()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 