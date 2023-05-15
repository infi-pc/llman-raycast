import { getSelectedText, Clipboard, showToast, Toast, AI, List, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [actions, setActions] = useState<
    | {
        status: "loading";
      }
    | {
        status: "success";
        data: string[];
      }
  >({
    status: "loading",
  });

  const [processingAction, setProcessingAction] = useState(false);
  useEffect(() => {
    async function run() {
      const selectedText = await getSelectedText()
        .then((text) => text.trim())
        .catch(() => null);

      if (!selectedText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text selected",
          message: "Please select some text to convert",
        });
        return;
      }

      const res = await AI.ask(
        `I am using GPT to transform text. I will give you text, and you will give me 5 prompts for transformations that can be done with the text. Text can be code, raw data, written text or any other data in text format. Prompts can be for example: "Convert CSS to CSS-in-JS format" if you recognise the text is CSS, "Convert json to yaml" in case the text is JSON, "Make the text more formal" for written texts, "Fix grammar" in case you see some grammar issues, "Fix syntax errors" in case it is a code and you see it has syntax errors etc. 

      Now here is the text and you give me the 5 prompts, one per line: \`${selectedText}\``,
        {
          model: "gpt-3.5-turbo",
        }
      );

      setActions({
        status: "success",
        data: res.trim().split("\n"),
      });
      //   const transformedText = await AI.ask(`Convert named function to arrow function: \`${selectedText}\``);

      //   await Clipboard.paste(transformedText);
    }
    run();
  }, []);

  return (
    <List isLoading={actions.status === "loading" || processingAction}>
      {actions.status === "success"
        ? actions.data.map((action, index) => (
            <List.Item
              key={index}
              title={action}
              subtitle={`#${index + 1}`}
              actions={
                <ActionPanel>
                  <Action
                    title="Apply"
                    onAction={async () => {
                      setProcessingAction(true);
                      const res = await AI.ask(`${action}: \`${await getSelectedText()}\``, {
                        model: "gpt-3.5-turbo",
                      });
                      Clipboard.paste(res);
                      setProcessingAction(false);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
  //   const [isLoading, setIsLoading] = useState(true);

  //   return <List isLoading={isLoading}>{/* Render your data */}</List>;
}
