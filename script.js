const API_KEY = 'CSUzyxmUxua1sgsW6ubVQdzM99NvgOCZEYySbtPM';
        const API_BASE_URL = 'https://api.nal.usda.gov/fdc/v1/';
        const DAILY_VALUES = { vitA: 900, vitC: 90, vitD: 20, calcium: 1300, iron: 18, potassium: 4700, magnesium: 420, sodium: 2300 };
        const DAILY_TARGETS = { calories: 2000, protein: 50, carbs: 300, fat: 65 };

        const categoryMap = {
            'Fruit': 'fruits', 'Vegetables': 'vegetables', 'Vegetable': 'vegetables',
            'Grain': 'grains', 'Cereal': 'grains', 'Rice': 'grains', 'Pasta': 'grains', 'Bread': 'grains',
            'Protein Foods': 'proteins', 'Meat': 'proteins', 'Poultry': 'proteins',
            'Seafood': 'proteins', 'Legumes': 'proteins', 'Nuts': 'proteins', 'Beans': 'proteins',
            'Dairy': 'dairy', 'Milk': 'dairy', 'Cheese': 'dairy', 'Yogurt': 'dairy', 'Cream': 'dairy',
            'Beverages': 'drinks', 'Water': 'drinks', 'Coffee': 'drinks', 'Tea': 'drinks', 'Juice': 'drinks', 'Soda': 'drinks',
            'Beer': 'alcohol', 'Wine': 'alcohol', 'Liquor': 'alcohol', 'Vodka': 'alcohol', 'Whiskey': 'alcohol', 'Rum': 'alcohol'
        };

        const unhealthyKeywords = ['chip', 'fries', 'fried', 'crisps', 'donut', 'cookie', 'candy', 'soda', 'cola', 'burger', 'nugget', 'pizza', 'ice cream', 'cake', 'frosted', 'sweetened', 'processed', 'bacon', 'sausage', 'hot dog', 'mayonnaise', 'ranch', 'syrup'];
        const waterKeywords = ['water', 'sparkling water', 'mineral water', 'filtered water'];
        const alcoholKeywords = ['beer', 'wine', 'vodka', 'whiskey', 'rum', 'gin', 'tequila', 'liquor', 'alcohol', 'cocktail', 'martini'];

        let addedFoods = [], addedDrinks = [], pendingFood = null, selectedFood = null;
        let isUSUnits = false;
        let mealHistory = JSON.parse(localStorage.getItem('mealHistory') || '[]');
        let currentFoodQuery = '';

        const convert = {
            gToOz: (g) => (g / 28.3495).toFixed(1),
            mlToFlOz: (ml) => (ml / 29.5735).toFixed(1),
            cmToFtIn: (cm) => {
                const inches = cm / 2.54;
                const ft = Math.floor(inches / 12);
                const ins = Math.round(inches % 12);
                return ft ? `${ft}'${ins}"` : `${ins}"`;
            },
            kgToLbs: (kg) => (kg * 2.20462).toFixed(1)
        };

        const els = {
            unitMetric: document.getElementById('unit-metric'),
            unitUS: document.getElementById('unit-us'),
            themeLight: document.getElementById('theme-light'),
            themeDark: document.getElementById('theme-dark'),
            foodSearch: document.getElementById('food-search'),
            brandSearch: document.getElementById('brand-search'),
            foodDropdown: document.getElementById('food-dropdown'),
            brandDropdown: document.getElementById('brand-dropdown'),
            brandStep: document.getElementById('brand-step'),
            brandBox: document.getElementById('brand-box'),
            servingControls: document.getElementById('serving-controls'),
            confirmBtn: document.getElementById('confirm-btn'),
            servingQuantity: document.getElementById('serving-quantity'),
            servingSize: document.getElementById('serving-size'),
            servingLabel: document.getElementById('serving-label'),
            foodList: document.getElementById('food-list'),
            drinkList: document.getElementById('drink-list'),
            recommendations: document.getElementById('recommendations'),
            nutritionInfo: document.getElementById('nutrition-info'),
            dairyCircle: document.getElementById('dairy-circle'),
            alcoholWarning: document.getElementById('alcohol-warning'),
            bmiBtn: document.getElementById('bmi-btn'),
            bmiResult: document.getElementById('bmi-result'),
            heightInput: document.getElementById('height'),
            weightInput: document.getElementById('weight'),
            heightUnit: document.getElementById('height-unit'),
            weightUnit: document.getElementById('weight-unit'),
            proteinUnit: document.getElementById('protein-unit'),
            carbsUnit: document.getElementById('carbs-unit'),
            fatUnit: document.getElementById('fat-unit')
        };

        // Theme & Units
        els.themeLight.onclick = () => setTheme('light');
        els.themeDark.onclick = () => setTheme('dark');
        function setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            els.themeLight.classList.toggle('active', theme === 'light');
            els.themeDark.classList.toggle('active', theme === 'dark');
            localStorage.setItem('theme', theme);
        }
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);

        els.unitMetric.onclick = () => { isUSUnits = false; updateUnits(); };
        els.unitUS.onclick = () => { isUSUnits = true; updateUnits(); };
        function updateUnits() {
            const active = isUSUnits ? els.unitUS : els.unitMetric;
            const inactive = isUSUnits ? els.unitMetric : els.unitUS;
            active.classList.add('active');
            inactive.classList.remove('active');
            els.heightUnit.textContent = isUSUnits ? 'in' : 'cm';
            els.weightUnit.textContent = isUSUnits ? 'lbs' : 'kg';
            els.proteinUnit.textContent = isUSUnits ? 'oz' : 'g';
            els.carbsUnit.textContent = isUSUnits ? 'oz' : 'g';
            els.fatUnit.textContent = isUSUnits ? 'oz' : 'g';
            updateAll();
        }

        // BMI (unchanged)
        let bmiUpdateScheduled = false;
        function scheduleBMIUpdate() {
            if (bmiUpdateScheduled) return;
            bmiUpdateScheduled = true;
            requestAnimationFrame(() => {
                let h = parseFloat(els.heightInput.value);
                let w = parseFloat(els.weightInput.value);
                if (isUSUnits) {
                    if (!h || !w) { bmiUpdateScheduled = false; return; }
                    h = h * 2.54;
                    w = w / 2.20462;
                }
                if (!h || !w || h <= 0 || w <= 0) {
                    els.bmiResult.innerHTML = '<div style="background:#f44336;color:white;padding:10px;border-radius:8px;">Enter valid height & weight</div>';
                    bmiUpdateScheduled = false;
                    return;
                }
                const bmi = (w / ((h / 100) ** 2)).toFixed(1);
                const categories = [
                    { max: 18.5, label: 'Underweight', color: '#ff9800' },
                    { max: 25, label: 'Normal', color: '#4caf50' },
                    { max: 30, label: 'Overweight', color: '#ff9800' },
                    { max: Infinity, label: 'Obese', color: '#f44336' }
                ];
                const cat = categories.find(c => bmi < c.max);
                els.bmiResult.innerHTML = `<div style="background:${cat.color};color:white;padding:12px;border-radius:8px;">
                    BMI: <strong>${bmi}</strong> → ${cat.label}
                </div>`;
                bmiUpdateScheduled = false;
            });
        }
        els.heightInput.addEventListener('input', scheduleBMIUpdate);
        els.weightInput.addEventListener('input', scheduleBMIUpdate);
        els.bmiBtn.addEventListener('click', scheduleBMIUpdate);

        // === SEARCH FLOW ===
        els.foodSearch.addEventListener('input', debounce(async () => {
            const query = els.foodSearch.value.trim();
            currentFoodQuery = query;
            if (query.length < 2) {
                els.foodDropdown.style.display = 'none';
                resetBrandStep();
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy,Branded&pageSize=15`);
                const data = await res.json();
                renderFoodResults(data.foods || []);
            } catch (err) { console.warn('Search failed:', err); }
        }, 300));

        function renderFoodResults(foods) {
            els.foodDropdown.innerHTML = '';
            if (!foods.length) { els.foodDropdown.style.display = 'none'; return; }
            foods.forEach(food => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                const brand = food.brandOwner ? ` (${food.brandOwner})` : '';
                const type = food.dataType === 'Branded' ? ' [Branded]' : '';
                item.innerHTML = `${food.description}${brand}${type}`;
                item.onclick = () => selectBaseFood(food);
                els.foodDropdown.appendChild(item);
            });
            els.foodDropdown.style.display = 'block';
        }

        function selectBaseFood(food) {
            selectedFood = food;
            pendingFood = food;
            els.foodSearch.value = food.description;
            els.foodDropdown.style.display = 'none';

            els.brandStep.style.display = 'block';
            els.brandBox.style.display = 'block';
            els.brandSearch.disabled = false;
            els.brandSearch.placeholder = `Search ${food.description} by brand...`;
            els.brandSearch.focus();

            loadServingSizes(food.fdcId);
            els.servingControls.style.display = 'block';
        }

        els.brandSearch.addEventListener('input', debounce(async () => {
            const query = els.brandSearch.value.trim();
            if (!selectedFood || query.length < 2) {
                els.brandDropdown.style.display = 'none';
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&dataType=Branded&pageSize=10`);
                const data = await res.json();
                const filtered = (data.foods || []).filter(f => 
                    f.description.toLowerCase().includes(currentFoodQuery.toLowerCase())
                );
                renderBrandResults(filtered);
            } catch (err) { console.warn('Brand search failed:', err); }
        }, 300));

        function renderBrandResults(foods) {
            els.brandDropdown.innerHTML = '';
            if (!foods.length) { els.brandDropdown.style.display = 'none'; return; }
            foods.forEach(food => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.innerHTML = `${food.description} <small>(${food.brandOwner})</small>`;
                item.onclick = () => selectBrandedFood(food);
                els.brandDropdown.appendChild(item);
            });
            els.brandDropdown.style.display = 'block';
        }

        function selectBrandedFood(food) {
            pendingFood = food;
            els.brandSearch.value = food.description;
            els.brandDropdown.style.display = 'none';
            loadServingSizes(food.fdcId);
        }

        function resetBrandStep() {
            els.brandStep.style.display = 'none';
            els.brandBox.style.display = 'none';
            els.brandSearch.value = '';
            els.brandSearch.disabled = true;
            els.brandDropdown.style.display = 'none';
        }

        function resetAddFood() {
            pendingFood = null;
            selectedFood = null;
            currentFoodQuery = '';
            els.foodSearch.value = '';
            resetBrandStep();
            els.servingControls.style.display = 'none';
            els.servingQuantity.value = 1;
            els.servingSize.innerHTML = '';
            els.servingLabel.textContent = '';
        }

        // === LOAD SERVING SIZES – DRINKS USE mL/fl oz, NOT 100g ===
        async function loadServingSizes(fdcId) {
            try {
                const res = await fetch(`${API_BASE_URL}food/${fdcId}?api_key=${API_KEY}`);
                const data = await res.json();
                const select = els.servingSize;
                select.innerHTML = '<option value="">Select serving...</option>';

                const isDrink = pendingFood?.foodCategory?.includes('Beverages') || 
                              /water|coffee|tea|juice|soda|milk|drink|beverage/i.test(pendingFood.description);

                const servings = data.foodPortions || [];
                if (servings.length === 0) {
                    const defaultVal = isDrink ? 240 : 100;
                    const unit = isDrink ? (isUSUnits ? 'fl oz' : 'mL') : (isUSUnits ? 'oz' : 'g');
                    const display = isUSUnits 
                        ? (isDrink ? convert.mlToFlOz(defaultVal) + ' fl oz' : convert.gToOz(defaultVal) + ' oz')
                        : defaultVal + ' ' + (isDrink ? 'mL' : 'g');
                    select.innerHTML += `<option value="${defaultVal}">${display}</option>`;
                    els.servingLabel.textContent = `per ${display}`;
                    return;
                }

                servings.forEach(s => {
                    const opt = document.createElement('option');
                    let val = s.gramWeight;
                    let label = s.modifier;

                    if (isDrink && s.measureUnit?.name?.toLowerCase().includes('ml')) {
                        val = s.amount * 240; // assume 240mL per unit if not gram
                        label = s.modifier;
                    }

                    const display = isUSUnits
                        ? (isDrink ? convert.mlToFlOz(val) + ' fl oz' : convert.gToOz(val) + ' oz')
                        : val + (isDrink ? ' mL' : ' g');

                    opt.value = val;
                    opt.textContent = `${label} (${display})`;
                    select.appendChild(opt);
                });

                select.onchange = () => {
                    const val = select.value;
                    const unit = isDrink ? (isUSUnits ? 'fl oz' : 'mL') : (isUSUnits ? 'oz' : 'g');
                    const display = isUSUnits
                        ? (isDrink ? convert.mlToFlOz(val) + ' fl oz' : convert.gToOz(val) + ' oz')
                        : val + ' ' + unit;
                    els.servingLabel.textContent = val ? `per ${display}` : '';
                };
            } catch (err) {
                console.error("Failed to load servings:", err);
            }
        }

        window.confirmAddFood = function() {
            if (!pendingFood) return;
            const qty = parseFloat(els.servingQuantity.value) || 1;
            const servingVal = parseFloat(els.servingSize.value) || (pendingFood?.foodCategory?.includes('Beverages') ? 240 : 100);
            const totalVal = qty * servingVal;
            addFoodWithServing(pendingFood, totalVal, qty, servingVal);
            resetAddFood();
        };

        async function addFoodWithServing(food, totalVal, quantity, servingVal) {
            const name = food.description.toLowerCase();
            const usdaCat = food.foodCategory || '';
            let category = 'unknown';

            if (alcoholKeywords.some(k => name.includes(k)) || usdaCat.includes('Alcoholic')) {
                category = 'alcohol';
            } else if (usdaCat.includes('Beverages') || /water|coffee|tea|juice|soda|drink|beverage|milk/i.test(name)) {
                category = 'drinks';
            } else if (/milk|cheese|yogurt|cream|butter|dairy/i.test(name) && !usdaCat.includes('Beverages')) {
                category = 'dairy';
            } else {
                for (const [key, val] of Object.entries(categoryMap)) {
                    if (usdaCat.includes(key) || name.includes(key.toLowerCase())) { category = val; break; }
                }
            }

            // Never classify drinks as grains
            if (category === 'grains' && (category === 'drinks' || usdaCat.includes('Beverages'))) {
                category = 'drinks';
            }

            try {
                const detailRes = await fetch(`${API_BASE_URL}food/${food.fdcId}?api_key=${API_KEY}`);
                const detail = await detailRes.json();
                const nutrients = extractNutrients(detail.foodNutrients || [], totalVal, category === 'drinks' || category === 'alcohol');
                const isDrink = category === 'drinks' || category === 'alcohol';
                const unit = isUSUnits ? (isDrink ? 'fl oz' : 'oz') : (isDrink ? 'mL' : 'g');
                const displayVal = isUSUnits
                    ? (isDrinkDrink ? convert.mlToFlOz(servingVal) : convert.gToOz(servingVal))
                    : servingVal;
                const servingText = quantity === 1 
                    ? `${displayVal} ${unit}`
                    : `${quantity} × ${displayVal} ${unit}`;

                const isWater = waterKeywords.some(k => name.includes(k));
                const isAlcohol = category === 'alcohol';
                const foodData = {
                    name, fdcId: food.fdcId, category,
                    original: food.description, brand: food.brandOwner || '',
                    nutrients, quantity, servingText,
                    unhealthy: !isWater && unhealthyKeywords.some(k => name.includes(k)),
                    isAlcohol, isDrink
                };

                if (isDrink) {
                    addedDrinks.push(foodData);
                } else {
                    addedFoods.push(foodData);
                }

                if (isAlcohol) {
                    els.alcoholWarning.style.display = 'block';
                }

                updateAll();
            } catch (err) {
                console.error("Failed to fetch details:", err);
            }
        }

        function extractNutrients(nutrients, servingVal, isDrink) {
            const get = (keys) => {
                for (const nut of nutrients) {
                    if (keys.some(k => nut.nutrient.name.toLowerCase().includes(k))) {
                        return (nut.amount || 0) * (servingVal / (isDrink ? 240 : 100));
                    }
                }
                return 0;
            };
            return {
                calories: get(['energy', 'kcal']),
                protein: get(['protein']),
                carbs: get(['carbohydrate', 'total sugars']),
                fat: get(['fat', 'lipid']),
                vitA: get(['vitamin a']) / 1000,
                vitC: get(['vitamin c']),
                vitD: get(['vitamin d']),
                calcium: get(['calcium']),
                iron: get(['iron']),
                potassium: get(['potassium']),
                magnesium: get(['magnesium']),
                sodium: get(['sodium'])
            };
        }

        // === UPDATE FUNCTIONS (unchanged except drink list) ===
        function updateAll() {
            updatePlate();
            updateDairyCircle();
            updateFoodList();
            updateDrinkList();
            updateNutritionInfo();
            updateRecommendations();
            updateMacroTracker();
            updateMicroTracker();
        }

        function updateFoodList() {
            els.foodList.innerHTML = '';
            addedFoods.forEach((f, i) => {
                const div = document.createElement('div');
                div.className = 'food-item';
                const unhealthy = f.unhealthy ? '<span class="warning-badge">Unhealthy</span>' : '';
                div.innerHTML = `
                    <div>
                        <span>${f.original} <small>(${f.category})</small>${unhealthy}</span>
                        <div class="food-serving">${f.servingText}</div>
                    </div>
                    <button class="remove-btn" onclick="removeFood(${i})">Remove</button>
                `;
                els.foodList.appendChild(div);
            });
        }

        function updateDrinkList() {
            els.drinkList.innerHTML = '';
            addedDrinks.forEach((d, i) => {
                const div = document.createElement('div');
                div.className = d.isAlcohol ? 'drink-item alcohol-item' : 'drink-item';
                const unhealthy = d.unhealthy ? '<span class="warning-badge">Unhealthy</span>' : '';
                const alcoholTag = d.isAlcohol ? '<span class="warning-badge" style="background:#e91e63;">Alcohol</span>' : '';
                div.innerHTML = `
                    <div>
                        <span>${d.original}${alcoholTag}${unhealthy}</span>
                        <div class="drink-serving">${d.servingText}</div>
                    </div>
                    <button class="remove-btn" onclick="removeDrink(${i})">Remove</button>
                `;
                els.drinkList.appendChild(div);
            });
        }

        function removeFood(i) { addedFoods.splice(i, 1); updateAll(); }
        function removeDrink(i) { addedDrinks.splice(i, 1); updateAll(); }

        function updatePlate() {
            ['fruits', 'vegetables', 'grains', 'proteins'].forEach(sec => {
                const filled = addedFoods.some(f => f.category === sec);
                document.querySelector(`.${sec}`).classList.toggle('filled', filled);
            });
        }

        function updateDairyCircle() {
            const hasDairy = addedFoods.some(f => f.category === 'dairy');
            els.dairyCircle.classList.toggle('filled', hasDairy);
        }

        function updateNutritionInfo() {
            const allItems = [...addedFoods, ...addedDrinks];
            if (!allItems.length) { els.nutritionInfo.innerHTML = ''; return; }
            const last = allItems[allItems.length - 1];
            els.nutritionInfo.innerHTML = `
                <h3>Latest: ${last.original}</h3>
                <p>Serving: ${last.servingText}</p>
                <p>Calories: ${last.nutrients.calories.toFixed(0)} kcal</p>
            `;
        }

        function updateRecommendations() {
            const filled = new Set(addedFoods.map(f => f.category));
            const missing = ['fruits', 'vegetables', 'grains', 'proteins', 'dairy'].filter(s => !filled.has(s));
            if (!missing.length) {
                els.recommendations.innerHTML = '<p style="color:green;font-weight:bold;">All sections filled!</p>';
                return;
            }
            const suggestions = {
                fruits: 'apple, banana, berries, orange',
                vegetables: 'broccoli, spinach, carrots, salad',
                grains: 'brown rice, quinoa, whole wheat bread',
                proteins: 'chicken, salmon, beans, eggs',
                dairy: 'milk, yogurt, cheese'
            };
            let html = '';
            missing.forEach(s => {
                html += `<p><strong>${s.charAt(0).toUpperCase() + s.slice(1)}</strong>: ${suggestions[s]}</p>`;
            });
            els.recommendations.innerHTML = html;
        }

        function updateMacroTracker() {
            const allItems = [...addedFoods, ...addedDrinks];
            const totals = allItems.reduce((acc, f) => {
                acc.calories += f.nutrients.calories;
                acc.protein += f.nutrients.protein;
                acc.carbs += f.nutrients.carbs;
                acc.fat += f.nutrients.fat;
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

            document.getElementById('calories-bar').style.width = Math.min((totals.calories / DAILY_TARGETS.calories) * 100, 100) + '%';
            document.getElementById('calories-value').textContent = Math.round(totals.calories);
            document.getElementById('calories-total').textContent = `${totals.calories.toFixed(0)} kcal`;

            const update = (id, value, target) => {
                const bar = document.getElementById(id);
                const percent = Math.min((value / target) * 100, 120);
                bar.style.width = percent + '%';
                const displayVal = isUSUnits ? (value / 28.35).toFixed(1) : value.toFixed(1);
                document.getElementById(id.replace('-bar', '-value')).textContent = Math.round(isUSUnits ? value / 28.35 : value);
                document.getElementById(id.replace('-bar', '-total')).textContent = `${displayVal}${isUSUnits ? ' oz' : ' g'}`;
            };
            update('protein-bar', totals.protein, DAILY_TARGETS.protein);
            update('carbs-bar', totals.carbs, DAILY_TARGETS.carbs);
            update('fat-bar', totals.fat, DAILY_TARGETS.fat);
        }

        function updateMicroTracker() {
            const allItems = [...addedFoods, ...addedDrinks];
            const totals = allItems.reduce((acc, f) => {
                Object.keys(DAILY_VALUES).forEach(k => {
                    acc[k] = (acc[k] || 0) + (f.nutrients[k] || 0);
                });
                return acc;
            }, {});

            Object.keys(DAILY_VALUES).forEach(nut => {
                const value = totals[nut] || 0;
                const dv = DAILY_VALUES[nut];
                const percent = Math.min((value / dv) * 100, 100);
                const bar = document.getElementById(`${nut}-bar`);
                bar.style.width = percent + '%';
                document.getElementById(`${nut}-value`).textContent = Math.round(percent);
                let unit = nut.includes('vitA') || nut.includes('vitD') ? 'µg' : 'mg';
                document.getElementById(`${nut}-total`).textContent = `${value.toFixed(1)} ${unit}`;
                bar.className = 'progress-bar';
                if (nut === 'sodium') {
                    if (percent > 100) bar.classList.add('excess');
                    else if (percent > 80) bar.classList.add('high');
                } else {
                    bar.classList.add(nut.startsWith('vit') ? 'vitamin' : 'mineral');
                }
            });
        }

        function saveCurrentMeal() {
            if (!addedFoods.length && !addedDrinks.length) return alert('Add items first!');
            const meal = {
                id: Date.now(),
                date: new Date().toLocaleString(),
                foods: [...addedFoods],
                drinks: [...addedDrinks]
            };
            mealHistory.unshift(meal);
            localStorage.setItem('mealHistory', JSON.stringify(mealHistory));
            updateHistory();
            alert('Meal saved!');
        }

        function loadMeal(meal) {
            addedFoods = meal.foods.map(f => ({...f}));
            addedDrinks = meal.drinks.map(d => ({...d}));
            updateAll();
            alert('Meal loaded!');
        }

        function clearHistory() {
            if (confirm('Clear all history?')) {
                mealHistory =  [];
                localStorage.removeItem('mealHistory');
                updateHistory();
            }
        }

        function updateHistory() {
            const list = document.getElementById('history-list');
            if (!mealHistory.length) {
                list.innerHTML = '<p style="color:#888; text-align:center;">No meals saved yet.</p>';
                return;
            }
            list.innerHTML = '';
            mealHistory.slice(0, 20).forEach(meal => {
                const div = document.createElement('div');
                div.className = 'history-item';
                const itemCount = meal.foods.length + meal.drinks.length;
                div.innerHTML = `
                    <div class="history-date">${meal.date}</div>
                    <div class="history-summary">${itemCount} item${itemCount > 1 ? 's' : ''}</div>
                `;
                div.onclick = () => loadMeal(meal);
                list.appendChild(div);
            });
        }

        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => { clearTimeout(timeout); func(...args); };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        updateUnits();
        updateAll();
        updateHistory();
