# Fancy Page Loader

![jsDelivr monthly hits (GitHub)](https://img.shields.io/jsdelivr/gh/hm/AspieSoft/fancy-page-loader)

[![donation link](https://img.shields.io/badge/buy%20me%20a%20coffee-square-blue)](https://buymeacoffee.aspiesoft.com)

Uses the fetch method in JavaScript (if available) to load local pages in place of a url redirect. If you have a consistant header or some scripts that will always be used, you can avoid sending them, and reduce the bandwith usage of your website. As a plus, this package adds a fancy loading animation.

Note: if anything fails to load, the script should automatically let the browser handle the request normally.

## Installation

```html
<!--? setting media to "print" and then to "all" acts as an async load for stylesheets -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/AspieSoft/fancy-page-loader@1.0.0/style.min.css" media="print" onload="this.media='all'"/>
<script src="https://cdn.jsdelivr.net/gh/AspieSoft/fancy-page-loader@1.0.0/script.min.js" async></script>
```

## Setup

### Basic setup

- Add the attribute [main-page-content] to the main element that you want to replace the content of.
- Put this attribute on every page you want to reload.

By default, the page loader will detect this attribute if the fetch request receives an html string. Things should just start to work like magic.

### Optimized Setup (optional)

In addition to the basic setup, you can also optimize how you return content, to skip out on headers that will stay unchanged.

- When a fetch request is sent, it will send a `GET` request and include the query `FetchLoading="true"`, which you can use to detect when to send just the content.
- For this request, you should send a json responce (with the `content-type` set to include `application/json`)
- Send an object with the key `content` containing your html (including your page element containing the [main-page-content] attribute).
- (Optional) you can also send the key `url` containing a modified url in case you want to simulate a local redirect.
- If you send no `content` key in your object, the request will simply be redirected for the browser to handle the normal way.

### JavaScript Setup

One thing we cannot ignore, is the need to rerun some JavaScript, and replace old elements with the new ones inside your new page.
There is a custom event listener you can use for this.

```js

  let page = document.querySelector('[main-page-content]');

  // this event listener runs every time a new page is loaded, and on the initial load 10ms after 'DOMContentLoaded' runs
  document.addEventListener('FetchPageLoaded', function(e) {
    // note: the animation may still be running for the page when this is called
    // you can safely use a 'setTimeout(function(){}, 530);' inside this event listener to ensure the animation is done running

    // e.detail.page is your new page element that is being loaded
    page = e.detail.page;
  });

```

## Other features

By default, this package will detect mobile browsers with a page with less than 800px.
On mobile browsers, the popstate will scroll to top first in place of a page load (unless the user is already at the top of the page).

You can change this number by setting the variable `MobileWidth`, and can change this value dynamically at any time

```js

  // set the mobile width to less than 800px
  let MobileWidth = 800;

  setTimeout(function(){
    if(MessWithUsers === true){
      MobileWidth = 200;
    }
  }, 1000);

  setTimeout(function(){
    if(MessWithUsers === true){
      MobileWidth = 1080;
    }
  }, 3000);

```
