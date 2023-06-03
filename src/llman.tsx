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
        `I am using GPT to transform text. Please provide ${noPrompts} prompts for transformations that can be done with the given text. 
        The text can be in any format such as code, raw data, written text, etc. 
        For example, prompts can be: 
        - "Convert CSS to CSS-in-JS format" if the text is CSS
        - "Convert JSON to YAML" if the text is JSON
        - "Make the text more formal" for written texts
        - "Fix grammar" if there are grammar issues
        - "Fix syntax errors" if it is code and there are syntax errors, etc. 
        - "Rewrite text to twitter format" if the text something that can be posted on twitter
        - "Rewrite text to be more formal" if the text is informal
        - "Rewrite text to be more casual" if the text is formal
        - "Make bullet points" if the text is long and can be converted to bullet points
        - "Add more options" if the text is a list

        Don't try to offer code related prompts if the text is not code.

        ${debouncedSearchText ? `I am searching for prompts containing the text "${debouncedSearchText}"` : ""}

        Please provide the ${noPrompts} prompts, one per line, for the following text: 
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
                        For example, if the action is "Convert CSS to CSS-in-JS format", then you should only change the CSS part of the code snippet and keep the rest of the code as it is. Or if the action is to correct grammar, but the input is code, then you should only correct the grammar in the comments and string literals and keep the code as it is.

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
