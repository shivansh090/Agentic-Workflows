const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {

    const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Journal Entry 

 Date: December 8, 2024 

 Morning 



 Today began with a sense of purpose. I woke up around 7:00 AM, refreshed and ready to make the most of the day. After a quick stretch, I went through my morning routine: brushing my teeth and freshening up. Breakfast was simple but fulfilling—a couple of parathas with curd and a hot cup of tea, which I enjoyed while planning the tasks for the day. 

 Post breakfast, I dedicated some time to reading a book to nurture my newly formed habit of avoiding reels and shorts. It felt great to immerse myself in meaningful content; I could feel my focus and vocabulary improving with every page. 

 Afternoon 



 After finishing my reading, I turned my attention to my ongoing project work. I spent a few hours coding, debugging, and refining features. A bug in one of the routes was particularly challenging, but it gave me a great opportunity to sharpen my problem-solving skills. Around 1:30 PM, I paused for lunch, which was a delightful homemade dish—nothing beats mom's cooking! 

 Post lunch, I worked on enhancing my English-speaking skills. I practiced talking aloud about random topics and tried to record and analyze my pronunciation and tone. It felt a bit awkward at first, but it’s one step closer to improvement. 

 Evening 



 In the evening, I went for a short walk. The fresh air and a little movement helped clear my head. Back home, I spent some time brainstorming ideas for innovative activities I can pursue. I’ve been thinking about diving deeper into creative problem-solving challenges or maybe taking on a new coding language for fun. 

 Dinner was a simple yet hearty affair. We had dal, rice, and sabzi, and it gave me a chance to sit and chat with mom about the day. I cherish these moments—they’re so grounding. 

 Night 



 The day wound down with some quiet reflection. I noted down what I accomplished, the things that went well, and areas where I could improve. Journaling like this is becoming a peaceful habit—it helps me organize my thoughts and stay accountable. 

 Before bed, I skimmed through a few articles about role-based route protection, brushing up on the nuances of implementing it efficiently in my React-Express stack. 

 As I lie down to sleep, I feel content with the day. While there’s always room for improvement, I’m glad I’m actively working on building better habits and skills. Tomorrow awaits with its own set of challenges and possibilities! 

 Good night! 



 based on this journal, extract mood %, 0 means very bad mood and 100 means very happy. also find overall mood of day, happy or sad or angry or whatever. give me a activity suggestion, and give me a reason for stress if any. 

 return the result in a object with three key value pairs as told above. keep the stress "" if there isnt any. 

 dont return any other prompt, just return the object`;

    try {
        const result = await model.generateContent(prompt);
        let responseText = result.response?.text();

        // Clean the response text to extract valid JSON
        responseText = responseText.trim(); // Remove leading/trailing whitespace
        responseText = responseText.replace(/```json/g, "").replace(/```/g, ""); // Remove Markdown-like backticks

        // Parse the cleaned response text as JSON
        const responseObject = JSON.parse(responseText);
        console.log(responseObject);

    } catch (error) {
        console.error("Error generating content:", error);
    }
}

// Call the async function
main();
