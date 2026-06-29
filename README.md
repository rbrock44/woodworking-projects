# WoodworkingProjects

> This project is to showcase the woodworking projects <br/>
> [Live - WoodWorking Projects Website](https://woodworking-projects.ryan-brock.com/)

Screenshots:
![preview](/screenshots/main.png)
![project](/screenshots/project.png)
![project image](/screenshots/project-image.png)
![expanded image](/screenshots/expanded-image.png)

---

## 📚 Table of Contents

- [What's My Purpose?](#-whats-my-purpose)
- [How to Use](#-how-to-use)
- [Technologies](#-technologies)
- [VS Code Workspace](#-vs-code-workspace)
- [Getting Started (Local Setup)](#-getting-started-local-setup)
  - [Run Locally](#run-locally)
  - [Test](#test)
  - [GitHub Hooks](#github-hooks)
  - [Build](#build)
  - [Deploy](#deploy)

---

## 🧠 What's My Purpose?

This is a server side single-page angular frontend created to showcase the woodworking projects. [Image Repo](https://github.com/rbrock44/woodworking-projects-images/).

---

## 🚦 How to Use

- `Select Project` - Select any project (from any year or select `All` for an entire year)
- `Select Image` - Selecting an image from the project level will expand and make the images larger (but single view)
- `Expanded Image` - Click an image in single image project view and the image will be expanded to full screen with buttons (on the side(s) of the image to go forward and backward)

Screenshots:
![preview](/screenshots/main.png)
![project](/screenshots/project.png)
![project image](/screenshots/project-image.png)
![expanded image](/screenshots/expanded-image.png)

---

## 🛠 Technologies

- Framework: `Angular 18`
- Testing: `Karma`
- Deployment: `GitHub Pages`

---

## 🖥️ VS Code Workspace

A `woodworking.code-workspace` file is included in this repo. It opens both this project and the [woodworking-projects-images](https://github.com/rbrock44/woodworking-projects-images/) repo in a single VS Code instance.

**For the workspace file to work correctly, both repos must live side by side in the same parent folder:**

```
parent-folder/
├── woodworking-projects/        ← this repo
└── woodworking-projects-images/ ← image repo
```

Open the workspace by selecting **File > Open Workspace from File...** and choosing `woodworking.code-workspace`.

---

## 🚀 Getting Started (Local Setup)

* Install [node](https://nodejs.org/en) - v18 is needed (v20 also works)
* Clone [repo](https://github.com/rbrock44/woodworking-projects)
* Clone [image repo](https://github.com/rbrock44/woodworking-projects-images/) into the same parent folder (required for the VS Code workspace)

---

### Run Locally

```
npm install
npm start
```

---

### Test

- Unit
    - `ng test` || `npm run test`
- Integration
    - `ng e2e` || `npm run e2e`

---

### Github Hooks

- Build
    - Trigger: On Push to Main
    - Action(s): Builds application then kicks off gh page action to deploy build output

---

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

---

### Deploy

Run `npm run prod` to build and deploy the project. Make sure to be on `master` and that it is up to date before running the command. It's really meant to be a CI/CD action

---
