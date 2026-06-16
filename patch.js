const fs = require('fs');
let content = fs.readFileSync('../shop admin/app.js', 'utf8');

const targetStr = "Delete Order</button>\n      </div>";

const replacementStr = "Delete Order</button>\n        <button class=\"btn-icon\" onclick=\"notifyWhatsApp('${o._id}');\" style=\"padding: 10px; border-radius: 8px; border: 1px solid #25D366; background: #eafbee; color: #25D366; font-weight: 600;\"><i class=\"fab fa-whatsapp\"></i> Notify WhatsApp</button>\n      </div>";

if (content.includes(targetStr) && !content.includes('Notify WhatsApp')) {
    content = content.replace(targetStr, replacementStr);
}

const notifyFunc = "function notifyWhatsApp(orderId) {\n  const o = allOrders.find(x => x._id === orderId);\n  if (!o) return;\n  let phone = String(o.customerPhone).replace(/\\D/g, '');\n  if (phone.length === 10) phone = '91' + phone;\n  const text = 'Hi ' + o.customerName + ', your QuickShop order #' + orderId.slice(-4) + ' is now ' + o.status + '. Thank you for shopping with us!';\n  window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(text), '_blank');\n}\n";

if (!content.includes('notifyWhatsApp')) {
  content += '\n' + notifyFunc;
}

fs.writeFileSync('../shop admin/app.js', content);
console.log('Successfully updated app.js with WhatsApp integration');
