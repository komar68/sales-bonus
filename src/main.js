/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   const { discount, sale_price, quantity } = purchase;
   const discountDecimal = 1 - (discount / 100);
   return sale_price * quantity * discountDecimal;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    if (index === 0) {
        return profit * 0.15; // 15% для первого места
    } else if (index === 1 || index === 2) {
        return profit * 0.10; // 10% для второго и третьего места
    } else if (index === total - 1) {
        return 0; // 0% для последнего места
    } else {
        return profit * 0.05; // 5% для всех остальных
    }
    
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {  
    // Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products) 
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций
    if (typeof options !== 'object' 
        || options === null
        || !options.calculateRevenue 
        || !options.calculateBonus
        || typeof options.calculateRevenue !== 'function'
        || typeof options.calculateBonus !== 'function'
    ) {
        throw new Error('Некорректные опции');
    }

    const { calculateRevenue, calculateBonus } = options;

    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        bonus: 0
    }));

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(
        sellerStats.map(seller => [seller.id, seller])
    );
    
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        
        if (seller) {
            seller.sales_count += 1;
            seller.revenue += record.total_amount;

            record.items.forEach(item => {
                const product = productIndex[item.sku];
                
                if (product) {
                    // Расчет себестоимости
                    const cost = product.purchase_price * item.quantity;
                    
                    // Расчет выручки с учетом скидки
                    const revenue = calculateRevenue(item, product);
                    
                    // Расчет прибыли
                    const profit = revenue - cost;
                    
                    // Обновление общей прибыли продавца
                    seller.profit += profit;

                    // Учет количества проданных товаров
                    if (!seller.products_sold[item.sku]) {
                        seller.products_sold[item.sku] = 0;
                    }
                    seller.products_sold[item.sku] += item.quantity;
                }
            });
        }
    });

    // Сортировка продавцов по прибыли (по убыванию)
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        // Формирование топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}