🍳 Recipe Ideas App

Recipe Ideas is a simple and interactive web application that helps users discover new meals from around the world. By searching with an ingredient or a dish name, users can quickly find recipe ideas, view detailed instructions, and even save their favorites.

This project was built as part of a take-home challenge to demonstrate skills in interpreting user needs, API integration, and front-end development using React.

✨ Features

🔍 Search Recipes by entering an ingredient (e.g., chicken, paneer) or a dish name.

📂 Filter by Category & Cuisine (Area) for more tailored results.

📸 Recipe Cards showing meal images, names, and quick actions.

📑 Detailed Recipe View with a list of ingredients, cooking instructions, and optional YouTube video links.

⭐ Favorites System that lets users save recipes, stored in localStorage for persistence.

📄 Pagination to navigate large sets of search results easily.

📱 Responsive Design that adapts to both desktop and mobile screens.

⚡ Error Handling & Loading States to provide smooth user experience.

🛠️ Tech Stack

React (Vite) – component-based UI development

Tailwind CSS – utility-first framework for responsive styling

JavaScript (ES6+) – state management and API integration

TheMealDB API – free public recipe API for meal data

🔗 API Endpoints Used

Filter by Ingredient
https://www.themealdb.com/api/json/v1/1/filter.php?i={ingredient}

Search by Name
https://www.themealdb.com/api/json/v1/1/search.php?s={dishName}

Lookup Recipe Details by ID
https://www.themealdb.com/api/json/v1/1/lookup.php?i={mealId}

Random Recipe
https://www.themealdb.com/api/json/v1/1/random.php

🚀 Getting Started
Run Locally

Clone this repository:

git clone https://github.com/your-username/recipe-ideas-app.git
cd recipe-ideas-app


Install dependencies:

npm install


Start development server:

npm run dev


Open the app in your browser → http://localhost:5173

🌍 Live Demo : https://recipe-ideas-7id6.vercel.app/

Deployed Preview: Recipe Ideas App

CodeSandbox Project: View Source Code

📸 Screenshots
<img width="1420" height="882" alt="image" src="https://github.com/user-attachments/assets/18d7e5fe-35b2-4b81-bd58-91b40398c2a9" />
<img width="1417" height="791" alt="image" src="https://github.com/user-attachments/assets/6f25d8c1-d01b-4898-9f10-9a148b1ab876" />




📌 Notes

The app provides real-time recipes fetched directly from TheMealDB
.

Designed with focus on simplicity, clarity, and responsive UI.

Built as a demonstration project for learning and showcasing development practices.

📄 License

This project is for educational and demonstration purposes. Data is provided by the free TheMealDB
 API.
