import dotenv from "dotenv";
dotenv.config();
console.log("OpenAI API Key11111111111111111111111111111111111:", process.env.OPENAI_API_KEY);
import OpenAI from "openai";
const client = new OpenAI();
// let resp = await client.responses.create({
// model: "o3",
// input: "Write a poem on mothers love",
// background: true,
// // });
// console.log(resp);
async function f(){
    const ans= await client.responses.retrieve('resp_688494f5e9fc81a0b3c458194d8ccf070ffc0a2f88593fc3');
    console.log(ans.output_text);
}
f();
// while (resp.status === "queued" || resp.status === "in_progress") {
// console.log("Current status: " + resp.status);
// await new Promise(resolve => setTimeout(resolve, 2000)); 
// resp = await client.responses.retrieve(resp.id);
// }

// console.log("Final status: " + resp.status + "\nOutput:\n" + resp.output_text);