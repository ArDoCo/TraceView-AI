import { parseTraceLinksFromCSV } from "./parse/parse";
import { Application } from "./app/application";
import { MediationTraceabilityLink } from "./concepts/mediationTraceLink";
import { fabricateFileManagerPanelButton } from "./ui/fileManagerPanel";
import { FileManager } from "./app/fileManager";
import { Style } from "./style";
import { UIFactory } from "./uiFactory";
import {
  VisualizationFactory,
  VisualizationType,
} from "./artifactVisualizations/visFactory";
import "./styles/main.css";

const STYLE = Style.ARDOCO;

/**
 * Helper function to load a file from an url
 * @param url the url to load the file from
 */
export async function load(url: string): Promise<string> {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load '${url}'. Status: ${response.status}`);
      }
      return response.text();
    })
    .catch((error) => {
      console.error("Error loading file:", error);
      throw error;
    });
}

/**
 * Add the title to a panel
 * @param titlePanel the HTLMElement to add the title to
 */
function writeTitle(titlePanel: HTMLElement) {
  const title = "ArDoCo Trace View (TeaStore GPT-4o)";
  const titleSpan = document.createElement("span");

  const ardocoSpan = document.createElement("span");
  ardocoSpan.innerHTML = "ArDoCo";
  ardocoSpan.style.fontWeight = "bold";
  ardocoSpan.style.color = STYLE.getArdocoColor();

  const traceViewSpan = document.createElement("span");
  traceViewSpan.innerHTML = " Trace View";

  titleSpan.appendChild(ardocoSpan);
  titleSpan.appendChild(traceViewSpan);
  titlePanel.appendChild(titleSpan);
}

/**
 * Initialize the UI, sets up a {@link FileManager} and attaches a corresponding button to the top bar
 * @returns the file manager
 */
function initUI() {
  const head = document.head;
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = "https://ardoco.de/assets/img/logo.png";
  head.appendChild(link);

  const top = document.getElementById("top")!;
  top.classList.add("app-header");
  const img = document.createElement("img");
  img.src = "https://ardoco.de/assets/img/logo.png";
  img.ondragstart = () => false;
  top.appendChild(img);
  const titlePanel = document.createElement("div");
  titlePanel.id = "titlePanel";
  const buttonPanel = document.createElement("div");
  buttonPanel.id = "buttonPanel";
  top.appendChild(titlePanel);
  top.appendChild(buttonPanel);
  writeTitle(titlePanel);
  const fileManager = new FileManager();
  fabricateFileManagerPanelButton(buttonPanel, fileManager, STYLE);
  return fileManager;
}

/**
 * Initializes the application by adding the drag and drop functionality to the document, loading sample data and creating the {@link Application} object
 * @param fileManager The file manager the application should use
 */
async function init(fileManager: FileManager) {
  document.addEventListener("dragleave", (event) => {
    event.preventDefault();
  });
  document.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  document.addEventListener("drop", (event) => {
    event.preventDefault();
    const files = event.dataTransfer!.files;
    fileManager.addFiles(Array.from(files));
  });
  const middle = document.getElementById("middle")!;
  middle.style.backgroundColor = STYLE.getBackgroundColor();
  const urlPrefix =
    "https://raw.githubusercontent.com/ArDoCo/TraceView-AI/main-ai/result-ai/";
  function truncateId(id: string): string {
    const sep = "tools/descartes/"; // TODO: don't hardcode this
    return id.indexOf(sep) == -1 ? id : id.substring(id.indexOf(sep));
  }

  fileManager.addTextFile(
    "umlToNL.txt",
    await load(urlPrefix + "/goldstandards/goldstandard_sad_2020-sam_2020.csv"),
  );
  fileManager.addTextFile(
    "umlToCode.txt",
    await load(urlPrefix + "goldstandards/goldstandard_sam_2020-code_2022.csv"),
  );
  fileManager.addTextFile(
    "nlToCode.txt",
    await load(urlPrefix + "goldstandards/goldstandard_sad_2020-code_2022.csv"),
  );
  fileManager.addTextFile(
    "teastore.txt",
    await load(urlPrefix + "text_2020/teastore.txt"),
  );
  fileManager.addTextFile(
    "teastore.uml",
    await load(urlPrefix + "model_generated/uml/teastore.uml"),
  );
  fileManager.addTextFile(
    "codeModel.acm",
    await load(urlPrefix + "model_2022/code/codeModel.acm"),
  );
  const totalTraceLinks = [
    parseTraceLinksFromCSV(fileManager.getContent("umlToNL.txt")).map(
      (link) => new MediationTraceabilityLink(link.source, link.target, 1, 0),
    ),
    parseTraceLinksFromCSV(fileManager.getContent("umlToCode.txt")).map(
      (link) =>
        new MediationTraceabilityLink(
          link.source,
          truncateId(link.target),
          1,
          2,
        ),
    ),
    parseTraceLinksFromCSV(fileManager.getContent("nlToCode.txt")).map(
      (link) =>
        new MediationTraceabilityLink(
          link.source,
          truncateId(link.target),
          0,
          2,
        ),
    ),
  ].reduce((a, b) => a.concat(b), []);
  const app: Application = new Application(
    middle,
    fileManager,
    new VisualizationFactory(),
    STYLE,
  );
  app.addVisualizationFromData(VisualizationType.NL, [
    fileManager.getContent("teastore.txt"),
  ]);
  app.addVisualizationFromData(VisualizationType.UML, [
    fileManager.getContent("teastore.uml"),
  ]);
  app.addVisualizationFromData(VisualizationType.CODE, [
    fileManager.getContent("codeModel.acm"),
  ]);
  app.addTraceLinksFromData(totalTraceLinks);
  const buttonPanel = document.getElementById("top")!.lastChild as HTMLElement;
  const openVisInitDialog = () => {
    app.promptForNewVisualization();
  };
  const addLinks = () => {
    app.promptForTraceLinks();
  };
  const addUtility = () => {
    app.addTraceLinkVisualization();
  };
  const addVisButton = UIFactory.fabricatePageHeaderDropdownButton(
    ["+"],
    ["Add Visualization", "Add TraceLinks", "Add Other"],
    [openVisInitDialog, addLinks, addUtility],
    0.6 * buttonPanel.getBoundingClientRect().height,
    STYLE,
  );
  buttonPanel.insertBefore(addVisButton, buttonPanel.firstChild);
}

document.addEventListener("DOMContentLoaded", () => {
  init(initUI());
});
