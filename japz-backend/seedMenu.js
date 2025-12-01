import { sequelize } from './models/db.js';
import { MenuCategory } from './models/menuCategoryModel.js';
import { MenuItem } from './models/menuItemModel.js';

async function seedMenu() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Clear existing data
    await MenuItem.destroy({ where: {} });
    await MenuCategory.destroy({ where: {} });
    console.log('Cleared existing menu data');

    // Create Categories
    const categories = await MenuCategory.bulkCreate([
      { name: 'Burgers', description: 'Classic burger options', icon: 'dish' },
      { name: 'Sandwiches', description: 'Grilled sandwiches', icon: 'dish' },
      { name: 'Pasta', description: 'Italian pasta dishes', icon: 'dish' },
      { name: 'Fries & Chips', description: 'Side dishes and snacks', icon: 'dish' },
      { name: 'Beverages', description: 'Iced teas and lemonades', icon: 'droplets' },
      { name: 'Coolers', description: 'Special drinks and shakes', icon: 'droplets' },
      { name: 'Coffee', description: 'Hot and cold coffee drinks', icon: 'droplets' },
      { name: 'Add-ons', description: 'Extra toppings and ingredients', icon: 'dish' },
    ]);

    console.log('Categories created:', categories.length);

    // Get category IDs
    const burgers = categories.find(c => c.name === 'Burgers');
    const sandwiches = categories.find(c => c.name === 'Sandwiches');
    const pasta = categories.find(c => c.name === 'Pasta');
    const friesChips = categories.find(c => c.name === 'Fries & Chips');
    const beverages = categories.find(c => c.name === 'Beverages');
    const coolers = categories.find(c => c.name === 'Coolers');
    const coffee = categories.find(c => c.name === 'Coffee');
    const addons = categories.find(c => c.name === 'Add-ons');

    // Create Menu Items
    const menuItems = [];

    // BURGERS
    menuItems.push(
      { name: 'Beefy Grilled Burger', categoryId: burgers.id, price: 79, description: '100% pure beef burger', status: 'available' },
      { name: 'Classic Grilled Burger', categoryId: burgers.id, price: 99, description: 'Classic grilled burger', status: 'available' },
      { name: 'Grilled Cheezy Burger', categoryId: burgers.id, price: 109, description: 'Cheezy burger', status: 'available' },
      { name: 'Grilled Cheezy Burger with Fries', categoryId: burgers.id, price: 159, description: 'Cheezy burger with fries', status: 'available' },
      { name: 'Bacon Cheese Burger', categoryId: burgers.id, price: 149, description: 'Burger with bacon and cheese', status: 'available' },
      { name: 'Bacon Cheese Overload Burger', categoryId: burgers.id, price: 179, description: 'Overloaded bacon and cheese burger', status: 'available' },
      { name: '2-Some Cheezy Burger', categoryId: burgers.id, price: 189, description: 'Double cheese burger', status: 'available' },
      { name: '3-Some Cheezy Burger', categoryId: burgers.id, price: 249, description: 'Triple cheese burger', status: 'available' }
    );

    // SANDWICHES
    menuItems.push(
      { name: 'Bacon and Ham Grilled Sandwich', categoryId: sandwiches.id, price: 99, description: 'Grilled sandwich with bacon and ham', status: 'available' },
      { 
        name: 'Classic Grilled Hungarian Sausage', 
        categoryId: sandwiches.id, 
        price: 119, 
        description: 'Grilled Hungarian sausage sandwich',
        hasFlavor: true,
        flavors: ['CHEESE', 'SPICY'],
        status: 'available' 
      }
    );

    // PASTA
    menuItems.push(
      { name: 'Beefy Lasagna', categoryId: pasta.id, price: 179, description: '100% pure beef lasagna', status: 'available' },
      { name: 'Beefy Carbonara', categoryId: pasta.id, price: 89, description: 'Creamy carbonara with beef', status: 'available' },
      { name: 'Beefy Carbonara with Nuggets', categoryId: pasta.id, price: 129, description: 'Carbonara with chicken nuggets', status: 'available' },
      { name: 'Beefy Spaghetti', categoryId: pasta.id, price: 89, description: 'Classic spaghetti with beef', status: 'available' },
      { name: 'Beefy Spaghetti with Nuggets', categoryId: pasta.id, price: 129, description: 'Spaghetti with chicken nuggets', status: 'available' },
      { name: 'Tuna Alfredo', categoryId: pasta.id, price: 89, description: 'Creamy Alfredo with tuna', status: 'available' },
      { name: 'Tuna Alfredo with Nuggets', categoryId: pasta.id, price: 129, description: 'Alfredo with chicken nuggets', status: 'available' },
      { name: 'Chicken Truffle', categoryId: pasta.id, price: 119, description: 'Truffle pasta with chicken', status: 'available' },
      { name: 'Chicken Truffle with Nuggets', categoryId: pasta.id, price: 159, description: 'Truffle pasta with extra nuggets', status: 'available' }
    );

    // FRIES & CHIPS
    menuItems.push(
      { name: 'Beefy Nachos', categoryId: friesChips.id, price: 179, description: 'Nachos with beef toppings', status: 'available' },
      { name: 'Cheezy BBQ Biggie Fries', categoryId: friesChips.id, price: 89, description: 'Large fries with cheese and BBQ', status: 'available' },
      { 
        name: 'Flavored Biggie Fries', 
        categoryId: friesChips.id, 
        price: 89, 
        description: 'Large fries with choice of flavor',
        hasFlavor: true,
        flavors: ['BBQ', 'CHEESE', 'SOUR CREAM'],
        status: 'available' 
      },
      { name: 'Chicken Nuggets (6 pcs)', categoryId: friesChips.id, price: 99, description: '6 pieces of chicken nuggets', status: 'available' },
      { 
        name: 'Flavored Chicken Pops', 
        categoryId: friesChips.id, 
        price: 99, 
        description: 'Chicken pops with choice of flavor',
        hasFlavor: true,
        flavors: ['ASIAN STYLE', 'BBQ', 'CHEESE', 'GARLIC PARMESAN', 'SOUR CREAM'],
        status: 'available' 
      }
    );

    // BEVERAGES
    menuItems.push(
      { 
        name: 'JAP2 House Blend', 
        categoryId: beverages.id, 
        price: 39, 
        description: 'House special iced tea',
        hasSize: true,
        sizes: ['Glass - ₱39', 'Pitcher - ₱99'],
        status: 'available' 
      },
      { name: 'Cucumber Mint Lemonade', categoryId: beverages.id, price: 89, description: 'Refreshing cucumber and mint lemonade', status: 'available' },
      { name: 'Honey Lychee Pink Lemonade', categoryId: beverages.id, price: 89, description: 'Sweet lychee lemonade with honey', status: 'available' },
      { name: 'Honey Blue Lemonade', categoryId: beverages.id, price: 89, description: 'Blue lemonade with honey', status: 'available' },
      { name: 'Strawberry Red Tea', categoryId: beverages.id, price: 89, description: 'Iced red tea with strawberry', status: 'available' }
    );

    // COOLERS
    menuItems.push(
      { name: 'JAPZ Halo-Halo', categoryId: coolers.id, price: 89, description: 'Filipino shaved ice dessert', status: 'available' },
      { name: 'Special Mais Con Yelo', categoryId: coolers.id, price: 89, description: 'Sweet corn with shaved ice', status: 'available' },
      { 
        name: 'Ice Cream (2 scoops)', 
        categoryId: coolers.id, 
        price: 49, 
        description: 'Two scoops of ice cream',
        hasFlavor: true,
        flavors: ['CHEESE', 'UBE'],
        status: 'available' 
      }
    );

    // COFFEE
    menuItems.push(
      { 
        name: 'Americano', 
        categoryId: coffee.id, 
        price: 59, 
        description: 'Hot or cold americano',
        hasSize: true,
        sizes: ['Medio - ₱59', 'Largo - ₱69'],
        status: 'available' 
      },
      { 
        name: 'Latte', 
        categoryId: coffee.id, 
        price: 75, 
        description: 'Hot or cold latte',
        hasSize: true,
        sizes: ['Medio - ₱75', 'Largo - ₱85'],
        status: 'available' 
      },
      { 
        name: 'Biscoff Latte', 
        categoryId: coffee.id, 
        price: 129, 
        description: 'Latte with Biscoff flavor',
        hasSize: true,
        sizes: ['Medio - ₱129', 'Largo - ₱149'],
        status: 'available' 
      },
      { 
        name: 'Brown Sugar Latte', 
        categoryId: coffee.id, 
        price: 75, 
        description: 'Latte with brown sugar',
        hasSize: true,
        sizes: ['Medio - ₱75', 'Largo - ₱85'],
        status: 'available' 
      },
      { 
        name: 'Caramel Latte', 
        categoryId: coffee.id, 
        price: 119, 
        description: 'Latte with caramel',
        hasSize: true,
        sizes: ['Medio - ₱119', 'Largo - ₱129'],
        status: 'available' 
      },
      { 
        name: 'JAPZ Signature Blend', 
        categoryId: coffee.id, 
        price: 89, 
        description: 'House special coffee blend',
        hasSize: true,
        sizes: ['Medio - ₱89', 'Largo - ₱99'],
        status: 'available' 
      },
      { 
        name: 'Spanish Latte', 
        categoryId: coffee.id, 
        price: 89, 
        description: 'Spanish-style latte',
        hasSize: true,
        sizes: ['Medio - ₱89', 'Largo - ₱99'],
        status: 'available' 
      },
      { 
        name: 'White Chocolate Mocha', 
        categoryId: coffee.id, 
        price: 119, 
        description: 'Mocha with white chocolate',
        hasSize: true,
        sizes: ['Medio - ₱119', 'Largo - ₱129'],
        status: 'available' 
      },
      { 
        name: 'Matcha', 
        categoryId: coffee.id, 
        price: 109, 
        description: 'Hot or cold matcha latte',
        hasSize: true,
        sizes: ['Medio - ₱109', 'Largo - ₱119'],
        status: 'available' 
      },
      { 
        name: 'Dirty Matcha', 
        categoryId: coffee.id, 
        price: 119, 
        description: 'Matcha with espresso shot',
        hasSize: true,
        sizes: ['Medio - ₱119', 'Largo - ₱129'],
        status: 'available' 
      },
      { 
        name: 'Avocado Latte', 
        categoryId: coffee.id, 
        price: 119, 
        description: 'Cold avocado latte (COLD ONLY)',
        hasSize: true,
        sizes: ['Medio - ₱119', 'Largo - ₱139'],
        status: 'available' 
      }
    );

    // ADD-ONS
    menuItems.push(
      { name: 'Bacon', categoryId: addons.id, price: 30, description: 'Extra bacon', status: 'available' },
      { name: 'Cheese', categoryId: addons.id, price: 20, description: 'Extra cheese', status: 'available' },
      { name: 'Egg', categoryId: addons.id, price: 20, description: 'Extra egg', status: 'available' },
      { name: 'Ham', categoryId: addons.id, price: 30, description: 'Extra ham', status: 'available' },
      { name: 'Jalapeño', categoryId: addons.id, price: 10, description: 'Extra jalapeño', status: 'available' },
      { name: 'Lettuce', categoryId: addons.id, price: 20, description: 'Extra lettuce', status: 'available' },
      { name: 'Extra Espresso Shot', categoryId: addons.id, price: 20, description: 'Add an extra shot of espresso', status: 'available' }
    );

    await MenuItem.bulkCreate(menuItems);
    console.log('Menu items created:', menuItems.length);

    // Update category item counts
    for (const category of categories) {
      const count = await MenuItem.count({ where: { categoryId: category.id } });
      await category.update({ itemCount: count });
    }

    console.log('Category item counts updated');
    console.log('✅ Menu seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding menu:', error);
    throw error;
  }
}

export { seedMenu };

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMenu().finally(() => process.exit());
}
