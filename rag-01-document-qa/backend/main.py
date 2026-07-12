from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI

from app.routes.upload import router as upload_router

app = FastAPI()

app.include_router(upload_router, prefix="/api")


@app.get("/")
async def read_root():
    return {"message": "Welcome to the Document QA API!"}