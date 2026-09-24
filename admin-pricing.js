(function () {
    'use strict';

    const config = window.MOFYCH_PRICING;
    const root = document.getElementById('tab-pricing');
    if (!config || !root) return;

    const STORAGE_KEY = 'mofych_pricing_estimates';
    const taskGrid = document.getElementById('pricingTaskGrid');
    let latest = null;

    function money(value) {
        return '฿' + Math.round(value).toLocaleString('th-TH');
    }

    function numberValue(id) {
        return Math.max(0, Number(document.getElementById(id)?.value) || 0);
    }

    taskGrid.innerHTML = config.defaults.tasks.map(task => `
        <div class="pricing-task">
            <label for="task-${task.id}">${task.label}</label>
            <input type="number" id="task-${task.id}" data-pricing-task min="0" step="0.25" value="${task.hours}" aria-label="${task.label} ชั่วโมง">
        </div>`).join('');

    function materialCost() {
        return Array.from(root.querySelectorAll('[data-material]')).reduce((sum, input) => {
            return sum + Math.max(0, Number(input.value) || 0);
        }, 0);
    }

    function taskHours() {
        return Array.from(root.querySelectorAll('[data-pricing-task]')).reduce((sum, input) => {
            return sum + Math.max(0, Number(input.value) || 0);
        }, 0) + numberValue('pricingExtraHours');
    }

    function calculate() {
        const salePrice = numberValue('pricingSalePrice');
        const margin = Math.min(0.8, numberValue('pricingMargin') / 100);
        const hours = taskHours();
        const materials = materialCost();
        const machineLife = Math.max(1, numberValue('machineLife'));
        const machineCost = numberValue('machinePrice') / machineLife * numberValue('machineJobHours');
        const cashCost = materials + machineCost;
        const effectiveWage = hours > 0 ? Math.max(0, salePrice - cashCost) / hours : 0;

        document.getElementById('pricingMarketPrice').textContent = money(salePrice);
        document.getElementById('pricingCashCost').textContent = money(cashCost);
        document.getElementById('pricingEffectiveWage').textContent = money(effectiveWage) + '/ชม.';
        document.getElementById('pricingTotalHours').textContent = hours.toFixed(2).replace(/\.00$/, '');
        document.getElementById('pricingHoursSummary').textContent = hours.toFixed(2).replace(/\.00$/, '') + ' ชม.';

        const comparisons = config.wageComparisons.map(wage => {
            const labor = hours * wage;
            const fullCost = cashCost + labor;
            const suggested = margin >= 1 ? fullCost : fullCost / (1 - margin);
            const difference = salePrice - fullCost;
            return { wage, labor, fullCost, suggested, difference };
        });

        document.getElementById('pricingWageComparisons').innerHTML = `
            <div class="pricing-comparison-list">
                ${comparisons.map(item => `
                    <article class="pricing-comparison ${item.difference < 0 ? 'is-below' : ''}">
                        <h4>ค่าแรง ${money(item.wage)}/ชม.</h4>
                        <strong>ราคาตามเป้า ${money(item.suggested)}</strong>
                        <p>ค่าแรงรวม ${money(item.labor)} · ต้นทุนเต็ม ${money(item.fullCost)} · ราคาที่ขายต่าง ${item.difference >= 0 ? '+' : '−'}${money(Math.abs(item.difference))}</p>
                    </article>`).join('')}
            </div>`;

        latest = {
            id: Date.now().toString(36),
            date: new Date().toISOString(),
            modelName: document.getElementById('pricingModelName').value.trim() || config.modelName,
            salePrice, margin, hours, materials, machineCost, cashCost, effectiveWage, comparisons
        };
    }

    function getHistory() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch (error) { return []; }
    }

    function renderHistory() {
        const history = getHistory();
        const wrap = document.getElementById('pricingHistory');
        if (!history.length) {
            wrap.innerHTML = '<p class="pricing-history-empty">ยังไม่มีบันทึกส่วนตัว</p>';
            return;
        }
        wrap.innerHTML = history.slice(0, 8).map(item => `
            <article class="pricing-history-item">
                <strong>${item.name || item.modelName}</strong>
                <small>${money(item.salePrice)} · ${Number(item.hours).toFixed(1)} ชม. · ค่าแรงจริง ${money(item.effectiveWage)}/ชม.</small>
                <button type="button" data-delete-pricing="${item.id}">ลบ</button>
            </article>`).join('');
    }

    function saveEstimate() {
        calculate();
        const name = document.getElementById('pricingSaveName').value.trim();
        const history = getHistory();
        history.unshift({ ...latest, name: name || latest.modelName });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 30)));
        document.getElementById('pricingSaveName').value = '';
        renderHistory();
        if (typeof showToast === 'function') showToast('บันทึกการประเมินไว้ในเครื่องแล้ว', 'success');
    }

    root.addEventListener('input', calculate);
    root.addEventListener('change', calculate);
    document.getElementById('savePricingEstimate').addEventListener('click', saveEstimate);
    document.getElementById('pricingHistory').addEventListener('click', event => {
        const button = event.target.closest('[data-delete-pricing]');
        if (!button) return;
        const next = getHistory().filter(item => item.id !== button.dataset.deletePricing);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        renderHistory();
    });

    window.refreshAdminPricing = calculate;
    calculate();
    renderHistory();
}());
