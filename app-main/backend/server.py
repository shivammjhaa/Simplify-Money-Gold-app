from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import uuid
from datetime import datetime
import httpx
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# GoldAPI configuration
GOLD_API_KEY = "goldapi-1j4kiosmeual64y-io"
GOLD_API_BASE_URL = "https://www.goldapi.io/api"

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class MetalPrice(BaseModel):
    metal: str
    price_per_gram_inr: float
    price_per_oz_usd: float
    change_24h: float
    change_pct: float
    timestamp: datetime
    prev_close_price: float
    open_price: float
    high_price: float
    low_price: float

class MetalPriceResponse(BaseModel):
    metal: str
    price_per_gram_inr: float
    current_time: str
    prev_close_price: float
    open_price: float
    high_price: float
    low_price: float
    change_24h: float
    change_pct: float
    timestamp: str

# Mock data fallback
MOCK_METAL_PRICES = {
    "gold": {
        "price_per_oz_usd": 2650.0,
        "price_per_gram_inr": 7200.0,
        "change_24h": 15.5,
        "change_pct": 0.58,
        "prev_close_price": 7184.5,
        "open_price": 7190.0,
        "high_price": 7220.0,
        "low_price": 7180.0
    },
    "silver": {
        "price_per_oz_usd": 31.2,
        "price_per_gram_inr": 85.5,
        "change_24h": 0.8,
        "change_pct": 2.63,
        "prev_close_price": 84.7,
        "open_price": 85.0,
        "high_price": 86.2,
        "low_price": 84.5
    },
    "platinum": {
        "price_per_oz_usd": 985.0,
        "price_per_gram_inr": 2680.0,
        "change_24h": -12.3,
        "change_pct": -0.46,
        "prev_close_price": 2692.3,
        "open_price": 2685.0,
        "high_price": 2695.0,
        "low_price": 2675.0
    },
    "palladium": {
        "price_per_oz_usd": 1050.0,
        "price_per_gram_inr": 2855.0,
        "change_24h": 22.1,
        "change_pct": 0.78,
        "prev_close_price": 2832.9,
        "open_price": 2840.0,
        "high_price": 2860.0,
        "low_price": 2835.0
    }
}

async def fetch_metal_price_from_api(metal: str) -> Dict[str, Any]:
    """Fetch metal price from GoldAPI.io"""
    try:
        headers = {
            "x-access-token": GOLD_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Map metals to API endpoints
        metal_endpoints = {
            "gold": f"{GOLD_API_BASE_URL}/XAU/USD",
            "silver": f"{GOLD_API_BASE_URL}/XAG/USD", 
            "platinum": f"{GOLD_API_BASE_URL}/XPT/USD",
            "palladium": f"{GOLD_API_BASE_URL}/XPD/USD"
        }
        
        if metal.lower() not in metal_endpoints:
            raise HTTPException(status_code=400, detail=f"Unsupported metal: {metal}")
            
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(metal_endpoints[metal.lower()], headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Convert USD per oz to INR per gram (approximate conversion)
                usd_to_inr = 83.5  # Current approximate rate
                price_per_oz_usd = data.get('price', 0)
                price_per_gram_inr = (price_per_oz_usd / 31.1035) * usd_to_inr
                
                return {
                    "price_per_oz_usd": price_per_oz_usd,
                    "price_per_gram_inr": round(price_per_gram_inr, 2),
                    "change_24h": data.get('ch', 0),
                    "change_pct": data.get('chp', 0),
                    "prev_close_price": round((data.get('prev_close_price', price_per_oz_usd) / 31.1035) * usd_to_inr, 2),
                    "open_price": round((data.get('open_price', price_per_oz_usd) / 31.1035) * usd_to_inr, 2),
                    "high_price": round((data.get('high_price', price_per_oz_usd) / 31.1035) * usd_to_inr, 2),
                    "low_price": round((data.get('low_price', price_per_oz_usd) / 31.1035) * usd_to_inr, 2)
                }
            else:
                logging.warning(f"API returned status {response.status_code} for {metal}")
                return None
                
    except Exception as e:
        logging.error(f"Error fetching {metal} price from API: {str(e)}")
        return None

async def get_metal_price(metal: str) -> MetalPriceResponse:
    """Get metal price with API fallback to mock data"""
    
    # Try to fetch from API first
    api_data = await fetch_metal_price_from_api(metal)
    
    if api_data:
        current_time = datetime.now()
        return MetalPriceResponse(
            metal=metal.title(),
            price_per_gram_inr=api_data["price_per_gram_inr"],
            current_time=current_time.strftime("%Y-%m-%d %H:%M:%S"),
            prev_close_price=api_data["prev_close_price"],
            open_price=api_data["open_price"],
            high_price=api_data["high_price"],
            low_price=api_data["low_price"],
            change_24h=api_data["change_24h"],
            change_pct=api_data["change_pct"],
            timestamp=current_time.isoformat()
        )
    else:
        # Fallback to mock data
        mock_data = MOCK_METAL_PRICES.get(metal.lower())
        if not mock_data:
            raise HTTPException(status_code=404, detail=f"Metal {metal} not found")
            
        current_time = datetime.now()
        return MetalPriceResponse(
            metal=metal.title(),
            price_per_gram_inr=mock_data["price_per_gram_inr"],
            current_time=current_time.strftime("%Y-%m-%d %H:%M:%S"),
            prev_close_price=mock_data["prev_close_price"],
            open_price=mock_data["open_price"],
            high_price=mock_data["high_price"],
            low_price=mock_data["low_price"],
            change_24h=mock_data["change_24h"],
            change_pct=mock_data["change_pct"],
            timestamp=current_time.isoformat()
        )

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Simplify Money - Metal Prices API"}

@api_router.get("/metals", response_model=List[MetalPriceResponse])
async def get_all_metal_prices():
    """Get prices for all supported metals"""
    metals = ["gold", "silver", "platinum", "palladium"]
    
    # Fetch all metals concurrently
    tasks = [get_metal_price(metal) for metal in metals]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Filter out exceptions and return successful results
    successful_results = [result for result in results if isinstance(result, MetalPriceResponse)]
    
    if not successful_results:
        raise HTTPException(status_code=500, detail="Could not fetch any metal prices")
    
    return successful_results

@api_router.get("/metals/{metal}", response_model=MetalPriceResponse)
async def get_single_metal_price(metal: str):
    """Get price for a specific metal"""
    return await get_metal_price(metal)

# Legacy status endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()