import { AI } from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  openai_api_key: string;
}

export default async function ask(prompt: string): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.openai_api_key) {
    const res = AI.ask(prompt, {
      model: "gpt-3.5-turbo",
    });
    return res;
  } else {
    const configuration = new Configuration({
      apiKey: preferences.openai_api_key,
    });
    const openai = new OpenAIApi(configuration);
    console.log("prompt", prompt);

    await openai.listModels().then((res) => console.log(res.data.data.map((d) => d.id).join(", ")));

    const response = await openai
      .createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 2000,
        top_p: 1,
      })
      .catch((err) => {
        console.error(err.response.data);
        throw new Error(err.response.data.error.message);
      });

    const res = response.data.choices[0].message?.content;
    if (!res) {
      throw new Error("No response from OpenAI");
    }
    return res;
  }
}
