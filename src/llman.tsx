import { getSelectedText, Clipboard, showToast, Toast, List, ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import ask from "./ask";
import { matchResults } from "./matchResults";

function useDebounce(value: string, timeout: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), timeout);

    return () => clearTimeout(timeoutId);
  }, [value, timeout]);

  return debouncedValue;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [actions, setActions] = useState<
    | {
        status: "loading";
      }
    | {
        status: "streaming";
        data: string[];
      }
    | {
        status: "success";
        data: string[];
      }
  >({
    status: "loading",
  });

  const debouncedSearchText = useDebounce(searchText, 1000);

  const [results, setResults] = useState<{
    text: string;
    status: "streaming" | "success";
  } | null>(null);

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

      const noPrompts = debouncedSearchText ? 3 : 10;
      const resPromise = ask(
        `I am using GPT to transform text. I will give you text, and you will give me ${noPrompts} prompts for transformations that can be done with the text. 
        Text can be code, raw data, written text or any other data in text format. 
        Prompts can be for example: 
        "Convert CSS to CSS-in-JS format" if you recognise the text is CSS, 
        "Convert json to yaml" in case the text is JSON, 
        "Make the text more formal" for written texts, 
        "Fix grammar" in case you see some grammar issues, 
        "Fix syntax errors" in case it is a code and you see it has syntax errors etc. 

        ${debouncedSearchText ? `I search for prompts containing the text "${debouncedSearchText}"` : ""}

        Don't say anything else than the prompts.

      Now here is the text and you give me the ${noPrompts} prompts, one per line: 
      \`\`\`
      ${selectedText}
      \`\`\`
      `
      );

      resPromise.on("data", (data) => {
        setActions({
          status: "streaming",
          data: data.trim().split("\n"),
        });
      });

      const res = await resPromise;
      if (debouncedSearchText === searchText) {
        setActions({
          status: "success",
          data: res.trim().split("\n"),
        });
      }

      //   const transformedText = await AI.ask(`Convert named function to arrow function: \`${selectedText}\``);

      //   await Clipboard.paste(transformedText);
    }
    run();
  }, [debouncedSearchText]);

  if (results) {
    const codeResultString = matchResults(results.text);
    return (
      <Detail
        markdown={results.text}
        isLoading={results.status === "streaming"}
        actions={
          codeResultString ? (
            <ActionPanel>
              <Action
                title="Paste the Code"
                onAction={async () => {
                  Clipboard.paste(codeResultString);
                }}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }

  async function runAction(action: string) {
    setProcessingAction(true);
    const resPromise = ask(
      `I will give you text, you will apply this action on it: \`${action}\`. 
                        Try to include only one code snippet and put it into markdown code block. 
                        The code snippet can be used to directly replace the original text, so unless it is explicitely said, try too keep the original data and change only what is said in the "action". 

                        Text:\`${await getSelectedText()}\``
    );

    resPromise.on("data", (data) => {
      setResults({
        text: data,
        status: "streaming",
      });
    });

    const res = await resPromise;
    setResults({
      text: res,
      status: "success",
    });

    setProcessingAction(false);
  }

  return (
    <List
      isLoading={actions.status === "loading" || actions.status === "streaming" || processingAction}
      onSearchTextChange={(text) => setSearchText(text)}
      searchBarPlaceholder="Type in custom prompt"
    >
      {searchText ? (
        <List.Item
          key={searchText}
          title={searchText}
          subtitle={`#1`}
          actions={
            <ActionPanel>
              <Action
                title="Apply"
                onAction={async () => {
                  runAction(searchText);
                }}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {(actions.status === "success" || actions.status === "streaming") && !processingAction
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
                      runAction(action);
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
