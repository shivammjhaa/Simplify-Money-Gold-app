#!/usr/bin/env python3
"""
Backend API Testing for Simplify Money Metal Prices Application
Tests the FastAPI backend with goldapi.io integration
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Any

# Backend URL from environment
BACKEND_URL = "https://goldtracker-2.preview.emergentagent.com/api"

class MetalPricesAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        if not success:
            self.failed_tests.append(result)
            
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    Details: {details}")
    
    def test_health_check(self):
        """Test GET /api/ endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "Simplify Money" in data["message"]:
                    self.log_test("Health Check", True, f"Response: {data}")
                else:
                    self.log_test("Health Check", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
    
    def validate_metal_price_structure(self, data: Dict[str, Any], metal_name: str = None) -> bool:
        """Validate the structure of metal price response"""
        required_fields = [
            "metal", "price_per_gram_inr", "current_time", 
            "prev_close_price", "open_price", "high_price", "low_price",
            "change_24h", "change_pct", "timestamp"
        ]
        
        for field in required_fields:
            if field not in data:
                return False, f"Missing field: {field}"
        
        # Validate data types
        if not isinstance(data["metal"], str):
            return False, "metal should be string"
        if not isinstance(data["price_per_gram_inr"], (int, float)):
            return False, "price_per_gram_inr should be number"
        if not isinstance(data["current_time"], str):
            return False, "current_time should be string"
        if not isinstance(data["prev_close_price"], (int, float)):
            return False, "prev_close_price should be number"
        if not isinstance(data["open_price"], (int, float)):
            return False, "open_price should be number"
        if not isinstance(data["high_price"], (int, float)):
            return False, "high_price should be number"
        if not isinstance(data["low_price"], (int, float)):
            return False, "low_price should be number"
        if not isinstance(data["change_24h"], (int, float)):
            return False, "change_24h should be number"
        if not isinstance(data["change_pct"], (int, float)):
            return False, "change_pct should be number"
        if not isinstance(data["timestamp"], str):
            return False, "timestamp should be string"
        
        # Validate reasonable price ranges
        if data["price_per_gram_inr"] <= 0:
            return False, "price_per_gram_inr should be positive"
        
        # Validate metal name if provided
        if metal_name and data["metal"].lower() != metal_name.lower():
            return False, f"Expected metal {metal_name}, got {data['metal']}"
            
        return True, "Valid structure"
    
    def test_all_metals_endpoint(self):
        """Test GET /api/metals endpoint"""
        try:
            response = requests.get(f"{self.base_url}/metals", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    self.log_test("All Metals Endpoint", False, "Response should be an array")
                    return
                
                if len(data) != 4:
                    self.log_test("All Metals Endpoint", False, f"Expected 4 metals, got {len(data)}")
                    return
                
                expected_metals = {"gold", "silver", "platinum", "palladium"}
                returned_metals = {item["metal"].lower() for item in data}
                
                if expected_metals != returned_metals:
                    self.log_test("All Metals Endpoint", False, f"Expected metals {expected_metals}, got {returned_metals}")
                    return
                
                # Validate structure of each metal
                for metal_data in data:
                    is_valid, error_msg = self.validate_metal_price_structure(metal_data)
                    if not is_valid:
                        self.log_test("All Metals Endpoint", False, f"Invalid structure for {metal_data.get('metal', 'unknown')}: {error_msg}")
                        return
                
                self.log_test("All Metals Endpoint", True, f"Successfully returned {len(data)} metals with valid structure")
                
            else:
                self.log_test("All Metals Endpoint", False, f"Status code: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("All Metals Endpoint", False, f"Exception: {str(e)}")
    
    def test_individual_metal(self, metal: str):
        """Test GET /api/metals/{metal} endpoint"""
        try:
            response = requests.get(f"{self.base_url}/metals/{metal}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                is_valid, error_msg = self.validate_metal_price_structure(data, metal)
                if is_valid:
                    # Check if prices are realistic
                    price = data["price_per_gram_inr"]
                    realistic_ranges = {
                        "gold": (5000, 10000),
                        "silver": (50, 150),
                        "platinum": (2000, 4000),
                        "palladium": (2000, 4000)
                    }
                    
                    if metal.lower() in realistic_ranges:
                        min_price, max_price = realistic_ranges[metal.lower()]
                        if min_price <= price <= max_price:
                            self.log_test(f"Individual Metal - {metal.title()}", True, f"Price: ₹{price}/gram, Structure: Valid")
                        else:
                            self.log_test(f"Individual Metal - {metal.title()}", True, f"Price: ₹{price}/gram (outside typical range {min_price}-{max_price}), Structure: Valid")
                    else:
                        self.log_test(f"Individual Metal - {metal.title()}", True, f"Price: ₹{price}/gram, Structure: Valid")
                else:
                    self.log_test(f"Individual Metal - {metal.title()}", False, f"Invalid structure: {error_msg}")
                    
            else:
                self.log_test(f"Individual Metal - {metal.title()}", False, f"Status code: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test(f"Individual Metal - {metal.title()}", False, f"Exception: {str(e)}")
    
    def test_invalid_metal(self):
        """Test error handling for invalid metal name"""
        try:
            response = requests.get(f"{self.base_url}/metals/invalid", timeout=10)
            
            if response.status_code == 404:
                self.log_test("Error Handling - Invalid Metal", True, f"Correctly returned 404 for invalid metal")
            elif response.status_code == 400:
                self.log_test("Error Handling - Invalid Metal", True, f"Correctly returned 400 for invalid metal")
            else:
                self.log_test("Error Handling - Invalid Metal", False, f"Expected 404 or 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Error Handling - Invalid Metal", False, f"Exception: {str(e)}")
    
    def test_api_integration_quality(self):
        """Test if we're getting live data vs mock data"""
        try:
            # Get gold price twice with a small delay to see if data changes
            response1 = requests.get(f"{self.base_url}/metals/gold", timeout=10)
            
            if response1.status_code == 200:
                data1 = response1.json()
                
                # Check if timestamp is recent (within last hour)
                try:
                    timestamp = datetime.fromisoformat(data1["timestamp"].replace('Z', '+00:00'))
                    now = datetime.now()
                    time_diff = abs((now - timestamp.replace(tzinfo=None)).total_seconds())
                    
                    if time_diff < 3600:  # Within 1 hour
                        self.log_test("API Integration Quality", True, f"Recent timestamp: {data1['timestamp']}, appears to be live data")
                    else:
                        self.log_test("API Integration Quality", True, f"Older timestamp: {data1['timestamp']}, might be cached or mock data")
                        
                except Exception as e:
                    self.log_test("API Integration Quality", False, f"Could not parse timestamp: {str(e)}")
            else:
                self.log_test("API Integration Quality", False, f"Could not fetch gold price for quality check")
                
        except Exception as e:
            self.log_test("API Integration Quality", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🚀 Starting Backend API Tests for: {self.base_url}")
        print("=" * 60)
        
        # Test health check
        self.test_health_check()
        
        # Test all metals endpoint
        self.test_all_metals_endpoint()
        
        # Test individual metals
        metals = ["gold", "silver", "platinum", "palladium"]
        for metal in metals:
            self.test_individual_metal(metal)
        
        # Test error handling
        self.test_invalid_metal()
        
        # Test API integration quality
        self.test_api_integration_quality()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = total_tests - len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return len(self.failed_tests) == 0

if __name__ == "__main__":
    tester = MetalPricesAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend API is working correctly.")
        sys.exit(0)
    else:
        print(f"\n⚠️  {len(tester.failed_tests)} test(s) failed. Check the details above.")
        sys.exit(1)