/* =================================================
   REFERENCES
================================================= */
const canvas = document.getElementById("canvas");

const addRect = document.getElementById("addRect");
const addText = document.getElementById("addText");

const exportJSONBtn = document.getElementById("exportJSON");
const exportHTMLBtn = document.getElementById("exportHTML");

const layersList = document.getElementById("layersList");
const layerUp = document.getElementById("layerUp");
const layerDown = document.getElementById("layerDown");

const propWidth = document.getElementById("propWidth");
const propHeight = document.getElementById("propHeight");
const propBg = document.getElementById("propBg");
const propText = document.getElementById("propText");
const textProp = document.getElementById("textProp");

/* =================================================
   STATE
================================================= */
let elements = [];          // internal layer order (BOTTOM → TOP)
let selectedElement = null;

/* =================================================
   UTILS
================================================= */
function uid() {
  return "el_" + Math.random().toString(36).slice(2);
}

/* =================================================
   CREATE ELEMENT (USER ACTION ONLY)
================================================= */
addRect.onclick = () => createElement("rect");
addText.onclick = () => createElement("text");

function createElement(type, data = null) {
  const el = document.createElement("div");
  el.className = "element";

  el.dataset.id = data?.id || uid();
  el.dataset.type = type;

  el.style.left = (data?.x ?? 50) + "px";
  el.style.top = (data?.y ?? 50) + "px";
  el.style.width = (data?.width ?? 120) + "px";
  el.style.height = (data?.height ?? 80) + "px";
  el.style.background =
    data?.bg ?? (type === "rect" ? "#22c55e" : "transparent");
  el.style.color = "white";

  if (type === "text") {
    el.textContent = data?.text || "Text";
  }

  el.onclick = (e) => {
    e.stopPropagation();
    selectElement(el);
  };

  makeDraggable(el);
  canvas.appendChild(el);

  elements.push({ id: el.dataset.id, type });

  applyZIndexes();
  updateLayers();
  saveLayout();
}

/* =================================================
   SELECTION
================================================= */
canvas.onclick = () => deselect();

function selectElement(el) {
  deselect();
  selectedElement = el;
  el.classList.add("selected");
  addResizeHandles(el);
  updateProperties();
  updateLayers();
}

function deselect() {
  if (!selectedElement) return;
  selectedElement.classList.remove("selected");
  selectedElement.querySelectorAll(".handle").forEach(h => h.remove());
  selectedElement = null;
  updateProperties();
  updateLayers();
}

/* =================================================
   DRAGGING
================================================= */
function makeDraggable(el) {
  el.onmousedown = (e) => {
    if (el !== selectedElement) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    function move(ev) {
      let x = ev.clientX - canvasRect.left - (startX - rect.left);
      let y = ev.clientY - canvasRect.top - (startY - rect.top);

      x = Math.max(0, Math.min(x, canvas.clientWidth - el.offsetWidth));
      y = Math.max(0, Math.min(y, canvas.clientHeight - el.offsetHeight));

      el.style.left = x + "px";
      el.style.top = y + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      saveLayout();
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };
}

/* =================================================
   RESIZE
================================================= */
function addResizeHandles(el) {
  ["tl","tr","bl","br"].forEach(pos => {
    const h = document.createElement("div");
    h.className = "handle " + pos;
    el.appendChild(h);

    h.onmousedown = (e) => {
      e.stopPropagation();

      const startW = el.offsetWidth;
      const startH = el.offsetHeight;
      const startX = e.clientX;
      const startY = e.clientY;

      function resize(ev) {
        el.style.width = Math.max(30, startW + ev.clientX - startX) + "px";
        el.style.height = Math.max(30, startH + ev.clientY - startY) + "px";
      }

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", () => {
        document.removeEventListener("mousemove", resize);
        saveLayout();
      }, { once: true });
    };
  });
}

/* =================================================
   LAYERS (PDF-CORRECT)
================================================= */
function applyZIndexes() {
  elements.forEach((el, index) => {
    const dom = document.querySelector(`[data-id="${el.id}"]`);
    dom.style.zIndex = index;
  });
}

function updateLayers() {
  layersList.innerHTML = "";
  elements.forEach(el => {
    const li = document.createElement("li");
    li.textContent = el.type + " - " + el.id;
    const dom = document.querySelector(`[data-id="${el.id}"]`);
    if (dom === selectedElement) li.classList.add("active");
    li.onclick = () => selectElement(dom);
    layersList.appendChild(li);
  });
}

layerUp.onclick = () => {
  if (!selectedElement) return;

  const id = selectedElement.dataset.id;
  const index = elements.findIndex(e => e.id === id);
  if (index === elements.length - 1) return;

  [elements[index], elements[index + 1]] =
  [elements[index + 1], elements[index]];

  applyZIndexes();
  updateLayers();
  saveLayout();
};

layerDown.onclick = () => {
  if (!selectedElement) return;

  const id = selectedElement.dataset.id;
  const index = elements.findIndex(e => e.id === id);
  if (index === 0) return;

  [elements[index], elements[index - 1]] =
  [elements[index - 1], elements[index]];

  applyZIndexes();
  updateLayers();
  saveLayout();
};

/* =================================================
   PROPERTIES PANEL
================================================= */
function updateProperties() {
  if (!selectedElement) {
    propWidth.value = "";
    propHeight.value = "";
    propBg.value = "#000000";
    propText.value = "";
    textProp.style.display = "none";
    return;
  }

  propWidth.value = selectedElement.offsetWidth;
  propHeight.value = selectedElement.offsetHeight;
  propBg.value = selectedElement.style.background;

  if (selectedElement.dataset.type === "text") {
    textProp.style.display = "block";
    propText.value = selectedElement.textContent;
  } else {
    textProp.style.display = "none";
  }
}

[propWidth, propHeight, propBg, propText].forEach(inp => {
  inp.oninput = () => {
    if (!selectedElement) return;
    selectedElement.style.width = propWidth.value + "px";
    selectedElement.style.height = propHeight.value + "px";
    selectedElement.style.background = propBg.value;
    if (selectedElement.dataset.type === "text")
      selectedElement.textContent = propText.value;
    saveLayout();
  };
});

/* =================================================
   KEYBOARD
================================================= */
document.onkeydown = (e) => {
  if (!selectedElement) return;

  let x = selectedElement.offsetLeft;
  let y = selectedElement.offsetTop;
  const step = 5;

  if (e.key === "Delete") {
    const id = selectedElement.dataset.id;
    selectedElement.remove();
    elements = elements.filter(e => e.id !== id);
    selectedElement = null;
    saveLayout();
    updateLayers();
    updateProperties();
    return;
  }

  if (e.key === "ArrowLeft") x -= step;
  if (e.key === "ArrowRight") x += step;
  if (e.key === "ArrowUp") y -= step;
  if (e.key === "ArrowDown") y += step;

  selectedElement.style.left = x + "px";
  selectedElement.style.top = y + "px";
  saveLayout();
};

/* =================================================
   SAVE & LOAD (STABLE)
================================================= */
function saveLayout() {
  const data = elements.map(el => {
    const d = document.querySelector(`[data-id="${el.id}"]`);
    return {
      id: el.id,
      type: el.type,
      x: d.offsetLeft,
      y: d.offsetTop,
      width: d.offsetWidth,
      height: d.offsetHeight,
      bg: d.style.background,
      text: d.textContent,
      zIndex: d.style.zIndex
    };
  });
  localStorage.setItem("figma_layout", JSON.stringify(data));
}

function loadLayout() {
  const data = JSON.parse(localStorage.getItem("figma_layout"));
  if (!data) return;
  data.forEach(item => createElement(item.type, item));
}

loadLayout();

/* =================================================
   EXPORT
================================================= */
function download(name, content) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content]));
  a.download = name;
  a.click();
}

exportJSONBtn.onclick = () => {
  download("design.json", localStorage.getItem("figma_layout"));
};

exportHTMLBtn.onclick = () => {
  let html = "<body style='position:relative'>";
  elements.forEach(el => {
    const d = document.querySelector(`[data-id="${el.id}"]`);
    html += `<div style="position:absolute;left:${d.style.left};top:${d.style.top};
      width:${d.style.width};height:${d.style.height};background:${d.style.background}">
      ${el.type === "text" ? d.textContent : ""}
    </div>`;
  });
  html += "</body>";
  download("design.html", html);
};
