# WoodworkingProjects

[Live Site]([woodworking-projects.ryan-brock.com](https://woodworking-projects.ryan-brock.com/))

This project is to show off the woodworking projects. [Image Repo](https://github.com/rbrock44/woodworking-projects-images/). </br> 
The following should be done to all images uploaded to that repo: </br>
* compressed (I used [TinyPNG](https://tinypng.com/) previously).
* Aspect ratio of 4:3 (height:width)
  * User must install [ImageMagick](https://imagemagick.org/script/download.php#windows) before running scripts 
  * [find_not_3_by_4_aspect_ratio.ps1](https://github.com/rbrock44/woodworking-projects-images/blob/master/scripts/find_not_3_by_4_aspect_ratio.ps1) will create a not_3_by_4.txt file and output problem image paths
  * [fix_not_3_by_4.ps1](https://github.com/rbrock44/woodworking-projects-images/blob/master/scripts/fix_not_3_by_4.ps1) will read the not_3_by_4.txt file and pad black or white to make image 4:3 aspect ratio
  * Please delete not_3_by_4.txt file before pushing images to repo!

Github actions to deploy on commit to master are wired up

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.7.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
