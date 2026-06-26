# Use Node.js Alpine base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose Vite default port
EXPOSE 5173

# Run Vite dev server exposing to host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
