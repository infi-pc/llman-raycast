import { AI } from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";
import { getPreferenceValues } from "@raycast/api";
import { IncomingMessage } from "http";

interface Preferences {
  openai_api_key: string;
}

type ExtendedPromise = Promise<string> & {
  on(event: "data", listener: (chunk: string) => void): void;
};

export default function ask(prompt: string): ExtendedPromise {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.openai_api_key) {
    const res = AI.ask(prompt, {
      model: "gpt-3.5-turbo",
    });
    return res;
  } else {
    let localListener: ((chunk: string) => void) | null = null;

    const on = (_: "data", listener: (chunk: string) => void) => {
      localListener = listener;
    };

    const promise = new Promise<string>((resolve, reject) => {
      const configuration = new Configuration({
        apiKey: preferences.openai_api_key,
      });
      const openai = new OpenAIApi(configuration);
      let result = "";
      openai
        .createChatCompletion(
          {
            // model: "gpt-4",
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0,
            max_tokens: 2000,
            stream: true,
          },
          {
            responseType: "stream",
          }
        )
        .then((completion) => {
          const stream = completion.data as unknown as IncomingMessage;

          stream.on("data", (res) => {
            const payloads = res.toString().split("\n\n");
            for (const payload of payloads) {
              if (payload.includes("[DONE]")) return;
              if (payload.startsWith("data:")) {
                const data = JSON.parse(payload.replace("data: ", ""));
                try {
                  const chunk: undefined | string = data.choices[0].delta?.content;
                  if (chunk) {
                    result += chunk.toString();
                    if (localListener) {
                      localListener(result);
                    }
                  }
                } catch (error) {
                  console.log(`Error with JSON.parse and ${payload}.\n${error}`);
                }
              }
            }
          });
          stream.on("end", () => {
            setTimeout(() => {
              resolve(result);
            }, 0);
          });
          stream.on("error", (err: Error) => {
            reject(err);
          });
        })
        .catch((err) => {
          reject(err);
        });
    });

    const extended = promise as ExtendedPromise;
    extended.on = on;

    return extended;
    // const openai = new OpenAIApi(configuration);
    // console.log("prompt", prompt);
    // const response = await openai
    //   .createChatCompletion({
    //     model: "gpt-3.5-turbo",
    //     messages: [
    //       {
    //         role: "user",
    //         content: prompt,
    //       },
    //     ],
    //     temperature: 0,
    //     max_tokens: 2000,
    //   })
    //   .catch((err) => {
    //     console.error(err.response.data);
    //     throw new Error(err.response.data.error.message);
    //   });

    // const res = response.data.choices[0].message?.content;
    // if (!res) {
    //   throw new Error("No response from OpenAI");
    // }
    // return res;
  }
}
