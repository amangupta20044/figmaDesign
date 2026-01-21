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

let elements = [];
let selectedElement = null;

/* Utility */
function uid() {
  return "el_" + Date.now();
}

/* ---------------- Element Creation ---------------- */
addRect.onclick = () => createElement("rect");
addText.onclick = () => createElement("text");

function createElement(type) {
  const div = document.createElement("div");
  div.className = "element";
  div.dataset.id = uid();
  div.dataset.type = type;

  div.style.left = "50px";
  div.style.top = "50px";
  div.style.width = "120px";
  div.style.height = "80px";
  div.style.background = type === "rect" ? "#22c55e" : "transparent";
  div.style.color = "white";

  if (type === "text") div.textContent = "Text";

  div.onclick = (e) => {
    e.stopPropagation();
    selectElement(div);
  };

  makeDraggable(div);
  canvas.appendChild(div);

  elements.push({ id: div.dataset.id, type });
  updateLayers();
  save();
}

/* ---------------- Selection ---------------- */
canvas.onclick = () => deselect();

function selectElement(el) {
  deselect();
  selectedElement = el;
  el.classList.add("selected");
  addHandles(el);
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

/* ---------------- Dragging ---------------- */
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
      save();
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };
}

/* ---------------- Resize ---------------- */
function addHandles(el) {
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
        save();
      }, { once: true });
    };
  });
}

/* ---------------- Layers ---------------- */
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
  selectedElement.style.zIndex = +selectedElement.style.zIndex + 1 || 1;
  save();
};

layerDown.onclick = () => {
  if (!selectedElement) return;
  selectedElement.style.zIndex = +selectedElement.style.zIndex - 1 || 0;
  save();
};

/* ---------------- Properties ---------------- */
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
    save();
  };
});

/* ---------------- Keyboard ---------------- */
document.onkeydown = (e) => {
  if (!selectedElement) return;
  let x = selectedElement.offsetLeft;
  let y = selectedElement.offsetTop;
  const step = 5;

  if (e.key === "Delete") {
    selectedElement.remove();
    elements = elements.filter(e => e.id !== selectedElement.dataset.id);
    selectedElement = null;
    updateLayers();
    updateProperties();
    save();
  }

  if (e.key === "ArrowLeft") x -= step;
  if (e.key === "ArrowRight") x += step;
  if (e.key === "ArrowUp") y -= step;
  if (e.key === "ArrowDown") y += step;

  selectedElement.style.left = x + "px";
  selectedElement.style.top = y + "px";
};

/* ---------------- Save & Load ---------------- */
function save() {
  const data = elements.map(el => {
    const d = document.querySelector(`[data-id="${el.id}"]`);
    return {
      id: el.id,
      type: el.type,
      x: d.offsetLeft,
      y: d.offsetTop,
      w: d.offsetWidth,
      h: d.offsetHeight,
      bg: d.style.background,
      text: d.textContent,
      z: d.style.zIndex
    };
  });
  localStorage.setItem("layout", JSON.stringify(data));
}

function load() {
  const data = JSON.parse(localStorage.getItem("layout") || "[]");
  data.forEach(d => {
    createElement(d.type);
    const el = canvas.lastChild;
    el.style.left = d.x + "px";
    el.style.top = d.y + "px";
    el.style.width = d.w + "px";
    el.style.height = d.h + "px";
    el.style.background = d.bg;
    el.style.zIndex = d.z;
    if (d.type === "text") el.textContent = d.text;
  });
}
load();

/* ---------------- Export ---------------- */
function download(name, content) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content]));
  a.download = name;
  a.click();
}

exportJSONBtn.onclick = () => {
  download("design.json", localStorage.getItem("layout"));
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
