import "dotenv/config";
import { redis, redisHelper } from "./config/redis";

/**
 * Redis Test Suite
 * Pastikan Redis server sudah berjalan sebelum menjalankan test ini
 * 
 * Jalankan: bun run src/test-redis.ts
 */

async function runRedisTests() {
    console.log("\n🧪 ====== REDIS TEST SUITE ======\n");

    try {
        // Test 1: Health Check
        console.log("1️⃣ Testing Redis Health Check...");
        const isHealthy = await redisHelper.healthCheck();
        console.log(isHealthy ? "✅ Redis is healthy" : "❌ Redis is not responding");

        if (!isHealthy) {
            console.error("\n❌ Redis connection failed. Make sure Redis server is running!");
            process.exit(1);
        }

        // Test 2: Set & Get Cache
        console.log("\n2️⃣ Testing Set & Get Cache...");
        const testData = {
            id: 1,
            name: "Buku Pemrograman TypeScript",
            author: "John Doe",
            year: 2024,
        };

        const setResult = await redisHelper.setCache("test:book:1", testData, 60);
        console.log(setResult ? "✅ Data cached successfully" : "❌ Failed to cache data");

        const cachedData = await redisHelper.getCache("test:book:1");
        console.log("📦 Retrieved data:", cachedData);
        console.log(JSON.stringify(cachedData) === JSON.stringify(testData) ? "✅ Data matches" : "❌ Data mismatch");

        // Test 3: Check if Key Exists
        console.log("\n3️⃣ Testing Key Existence...");
        const exists = await redisHelper.exists("test:book:1");
        console.log(exists ? "✅ Key exists" : "❌ Key does not exist");

        // Test 4: Get TTL
        console.log("\n4️⃣ Testing TTL (Time To Live)...");
        const ttl = await redisHelper.getTTL("test:book:1");
        console.log(`⏰ TTL: ${ttl} seconds`);

        // Test 5: Increment Counter
        console.log("\n5️⃣ Testing Counter Increment...");
        const counter1 = await redisHelper.increment("test:counter", 60);
        const counter2 = await redisHelper.increment("test:counter", 60);
        const counter3 = await redisHelper.increment("test:counter", 60);
        console.log(`📊 Counter values: ${counter1}, ${counter2}, ${counter3}`);
        console.log(counter3 === 3 ? "✅ Counter working correctly" : "❌ Counter error");

        // Test 6: Multiple Keys with Pattern
        console.log("\n6️⃣ Testing Multiple Keys...");
        await redisHelper.setCache("test:book:2", { title: "Book 2" }, 60);
        await redisHelper.setCache("test:book:3", { title: "Book 3" }, 60);
        await redisHelper.setCache("test:member:1", { name: "Member 1" }, 60);

        // Test 7: Delete by Pattern
        console.log("\n7️⃣ Testing Delete by Pattern...");
        const deletedCount = await redisHelper.deleteCacheByPattern("test:book:*");
        console.log(`🗑️ Deleted ${deletedCount} keys with pattern 'test:book:*'`);

        // Test 8: Verify Deletion
        console.log("\n8️⃣ Verifying Deletion...");
        const book1Exists = await redisHelper.exists("test:book:1");
        const memberExists = await redisHelper.exists("test:member:1");
        console.log(book1Exists ? "❌ test:book:1 still exists" : "✅ test:book:1 deleted");
        console.log(memberExists ? "✅ test:member:1 still exists (correct)" : "❌ test:member:1 was deleted (wrong)");

        // Test 9: Direct Redis Command
        console.log("\n9️⃣ Testing Direct Redis Commands...");
        await redis.set("test:direct", "Hello Redis!", "EX", 30);
        const directValue = await redis.get("test:direct");
        console.log(`📝 Direct command result: ${directValue}`);

        // Test 10: List Operations
        console.log("\n🔟 Testing List Operations...");
        await redis.del("test:list");
        await redis.lpush("test:list", "item1", "item2", "item3");
        const listLength = await redis.llen("test:list");
        const listItems = await redis.lrange("test:list", 0, -1);
        console.log(`📋 List length: ${listLength}`);
        console.log(`📋 List items:`, listItems);

        // Cleanup Test Data
        console.log("\n🧹 Cleaning up test data...");
        await redisHelper.deleteCache("test:counter");
        await redisHelper.deleteCache("test:member:1");
        await redisHelper.deleteCache("test:direct");
        await redis.del("test:list");
        console.log("✅ Cleanup completed");

        console.log("\n🎉 ====== ALL TESTS PASSED! ======\n");

    } catch (error) {
        console.error("\n❌ Test failed:", error);
        process.exit(1);
    } finally {
        // Close Redis connection
        console.log("👋 Closing Redis connection...");
        await redis.quit();
        console.log("✅ Connection closed\n");
    }
}

// Run tests
runRedisTests();
