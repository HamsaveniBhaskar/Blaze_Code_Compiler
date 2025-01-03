# Use the official Node.js image as the base
FROM node:16

# Install Clang and other necessary tools
RUN apt-get update && apt-get install -y clang build-essential

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and yarn.lock into the container
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]
