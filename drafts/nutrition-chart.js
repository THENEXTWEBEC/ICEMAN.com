/* Not loaded by index.html. Enable only after ICEMAN approves values and reference basis. */
const required = ["energy", "protein", "fat", "carbohydrate"];
const labels = { energy:"Energía", protein:"Proteínas", fat:"Grasas", carbohydrate:"Carbohidratos" };
const units = { energy:"kcal", protein:"g", fat:"g", carbohydrate:"g" };
const safe = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);

export function createNutritionChart(container, officialSheet) {
  if (!(container instanceof HTMLElement)) throw new TypeError("A container element is required");
  const validate = (sheet) => {
    if (!sheet?.approved || !sheet.source || !sheet.product || !sheet.portion || !sheet.referenceLabel) throw new Error("Approved product, portion, source and reference basis are required");
    if (new URL(sheet.source).protocol !== "https:") throw new Error("An HTTPS source is required");
    for (const key of required) {
      const metric = sheet.metrics?.[key];
      if (!metric || !Number.isFinite(metric.value) || metric.value < 0 || !Number.isFinite(metric.reference) || metric.reference <= 0) throw new Error(`Missing official ${key} value or reference`);
    }
  };
  const draw = (sheet) => {
    validate(sheet);
    const circumference = 2 * Math.PI * 42;
    container.innerHTML = `<section class="nutrition-chart" aria-label="Información nutricional de ${safe(sheet.product)}"><div class="nutrition-chart-head"><h3>${safe(sheet.product)}</h3><p>Porción: ${safe(sheet.portion)}</p></div><div class="nutrition-chart-rings">${required.map((key) => {
      const metric = sheet.metrics[key];
      const percent = metric.value / metric.reference * 100;
      const offset = circumference * (1 - Math.min(percent,100) / 100);
      return `<div class="nutrition-chart-metric"><svg viewBox="0 0 100 100" role="img" tabindex="0" aria-label="${labels[key]}: ${metric.value} ${units[key]}, ${percent.toFixed(1)} por ciento de ${safe(sheet.referenceLabel)}"><title>${labels[key]}: ${metric.value} ${units[key]} por ${safe(sheet.portion)}</title><circle cx="50" cy="50" r="42" fill="none" stroke="#dce9ed" stroke-width="7"/><circle cx="50" cy="50" r="42" fill="none" stroke="#087fa6" stroke-width="7" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 50 50)"/></svg><strong>${safe(metric.value)} ${units[key]}</strong><span>${labels[key]}</span><small>${percent.toFixed(1)}% de ${safe(sheet.referenceLabel)}</small><span class="nutrition-chart-bar" aria-hidden="true"><i style="width:${Math.min(percent,100)}%"></i></span></div>`;
    }).join("")}</div><table><caption>Valores oficiales por ${safe(sheet.portion)}</caption><thead><tr><th scope="col">Nutriente</th><th scope="col">Cantidad</th><th scope="col">Referencia</th></tr></thead><tbody>${required.map((key) => `<tr><th scope="row">${labels[key]}</th><td>${safe(sheet.metrics[key].value)} ${units[key]}</td><td>${safe(sheet.metrics[key].reference)} ${units[key]}</td></tr>`).join("")}</tbody></table><p class="nutrition-chart-source">Fuente: <a href="${safe(sheet.source)}">ficha oficial aprobada por ICEMAN</a>.</p></section>`;
  };
  draw(officialSheet);
  return { update:draw };
}
