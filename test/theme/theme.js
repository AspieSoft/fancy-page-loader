'use strict'

const MobileWidth = 800;
const ShortScrollHeight = 1200;
const DebugMode = true;

;(function(){
  let page = document.querySelector('#page');
  if(!page){
    return;
  }

  document.addEventListener('DOMContentLoaded', function() {
    let scrollPos = sessionStorage.getItem('scrollpos:'+window.location.pathname);
    if(scrollPos){
      page.scrollTo({
        top: scrollPos,
        behavior: 'instant',
      });
    }
  });


  //todo: add a mobile scroll to top on back button pressed (note: this is more difficult than it sounds)
  window.addEventListener('beforeunload', function() {
    sessionStorage.setItem('scrollpos:'+window.location.pathname, page.scrollTop);
  });

  let main = page.querySelector('main');

  function onResize(){
    let backToContentWrapper = page.querySelector('.back-to-content-wrapper');

    if(window.innerWidth <= MobileWidth || page.scrollHeight <= ShortScrollHeight){
      if(backToContentWrapper){
        backToContentWrapper.remove();
      }
      return
    }else if(backToContentWrapper){
      return
    }

    backToContentWrapper = document.createElement('div');
    backToContentWrapper.classList.add('back-to-content-wrapper');

    if(main){
      main.appendChild(backToContentWrapper);
    }else{
      page.appendChild(backToContentWrapper);
    }

    const backToContent = document.createElement('a');
    backToContent.classList.add('back-to-content');
    backToContent.innerHTML = '<i class="fa-solid fa-caret-up"></i>';
    backToContent.href = '#';

    backToContentWrapper.appendChild(backToContent)

    backToContent.addEventListener('click', function(e) {
      e.preventDefault();
      if(page.scrollTop > 5000){
        page.scrollTo({top: 0, behavior: 'instant'});
      }else{
        page.scrollTo({top: 0});
      }
    });

    function onScroll(){
      if(page.scrollTop <= ShortScrollHeight){
        backToContent.style['transform'] = 'translateY(calc(120% + 20px))';
      }else{
        backToContent.style['transform'] = '';
        backToContent.style['transition'] = 'opacity 0.1s, transform 0.3s ease';
      }
    }
    onScroll();
    page.addEventListener('scroll', onScroll);
  }
  onResize();
  window.addEventListener('resize', onResize);

  document.addEventListener('FetchPageLoaded', function(e) {
    page = e.detail.page;
    if(!page){
      return;
    }

    main = page.querySelector('main');

    onResize();
  });
})();

;(function(){
  let headerSearchAutofill;

  // search history for the session
  const searchHistory = {};

  // search history for the user
  const userSearchHistory = {};

  // search history for all users
  const globalSearchHistory = {};

  //todo: make sending search history to server optional
  //todo: send search history on session end (page unload) or on an interval (or both)
  //todo: may send a request to the server for user and global search history (to keep them more private)
  //todo: may run entire search method server side
  //todo: may make this an api, and keep track of both origin and global history

  //todo: get list of pages and headers
  let SearchAutofillValues = [
    'test 1',
    'test 3',
    'test 2',
    'pizza',
    'pi',
    'pie',
    'cheese',
    'cookie',
    'pizza with cheese',
  ];

  //todo: get list of commands (only include admin commands for logged in admins)
  // may use a seperate list for admins, and append admin commands
  //todo: add hints to command list
  const SearchAutofillCMD = [
    'edit',
    'add',
    'save',
    'scroll',
  ];

  const spellTypoList = {
    's': ['z', 'c', 'x'],
    'z': ['s'],
    'c': ['k', 's'],
    'x': ['s'],
    'k': ['c'],
    'f': ['p'], // ph
    'a': ['e'],
    'e': ['a', 'i'],
    'i': ['e', 'y'],
    'y': ['u', 'i'],
    'u': ['y', 'o'],
    'o': ['u'],
  };

  // based on gboard
  const mobileTypoList = {
    'q': ['w', 'a'],
    'w': ['q', 'e', 'a', 's'],
    'e': ['w', 'r', 's', 'd'],
    'r': ['e', 't', 'd', 'f'],
    't': ['r', 'y', 'f', 'g'],
    'y': ['t', 'u', 'g', 'h'],
    'u': ['y', 'i', 'h', 'j'],
    'i': ['u', 'o', 'j', 'k'],
    'o': ['i', 'p', 'k', 'l'],
    'p': ['o', 'l'],

    'a': ['q', 'w', 's'],
    's': ['a', 'd', 'w', 'e', 'z'],
    'd': ['s', 'f', 'e', 'r', 'x'],
    'f': ['d', 'g', 'r', 't', 'c'],
    'g': ['f', 'h', 't', 'y', 'v'],
    'h': ['g', 'j', 'y', 'u', 'b'],
    'j': ['h', 'k', 'u', 'i', 'n'],
    'k': ['j', 'l', 'i', 'o', 'm'],
    'l': ['k', 'o', 'p'],

    'z': ['x', 's', ','],
    'x': ['z', 'c', 'd'],
    'c': ['x', 'v', 'f'],
    'v': ['c', 'b', 'g'],
    'b': ['v', 'n', 'h'],
    'n': ['b', 'm', 'j'],
    'm': ['n', 'k', '.'],

    '1': ['2', '@'],
    '2': ['1', '3', '#'],
    '3': ['2', '4', '$'],
    '4': ['3', '5', '_'],
    '5': ['4', '6', '&'],
    '6': ['5', '7', '-'],
    '7': ['6', '8', '+'],
    '8': ['7', '9', '('],
    '9': ['8', '0', ')'],
    '0': ['9', '/'],
  };

  let page = document.querySelector('#page');

  const searchHeaders = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ];

  let lastInputTime = 0;

  const SearchHandler = {
    SearchPage: function(value){
      // console.log('Search Page: ' + value)
      //todo: do advanced page search with value
      // scroll to and highlight headers and page content (prioritize headers over content)
      // allow arrow keys to select between search results incase multiples are found
      // may also add physical button to search input

      if(headerSearchAutofill){
        if(value && value !== ''){
          let searchList = advancedSearch(value, SearchAutofillValues);
          if(searchList.length === 0){
            headerSearchAutofill.innerHTML = '';
          }
          headerSearchAutofill.innerHTML = formatSearchList(searchList);
        }else{
          headerSearchAutofill.innerHTML = '';
        }
      }

      if(!value || value == ''){
        return;
      }

      let searchTime = Date.now();
      lastInputTime = searchTime;
      setTimeout(function(){
        if(lastInputTime === searchTime){
          if(page){
            const headers = page.querySelectorAll('[id],'+searchHeaders.join(','));
            let lowerVal = value.toLowerCase();
    
            for(let i = 0; i < headers.length; i++){
              if((headers[i].id && headers[i].id.toLowerCase() === lowerVal) || (searchHeaders.includes(headers[i].tagName.toLowerCase()) && headers[i].textContent.toLowerCase() === lowerVal)){
                headers[i].scrollIntoView();
                break;
              }
            }

            for(let i = 0; i < headers.length; i++){
              if((headers[i].id && headers[i].id.toLowerCase().startsWith(lowerVal) && (lowerVal.length >= 5 || headers[i].id.length / lowerVal.length < 3)) || (searchHeaders.includes(headers[i].tagName.toLowerCase()) && headers[i].textContent.toLowerCase().startsWith(lowerVal) && (lowerVal.length >= 5 || headers[i].textContent.length / lowerVal.length < 3))){
                setTimeout(function(){
                  headers[i].scrollIntoView();
                }, 100);
                break;
              }
            }
          }
        }
      }, 750);
    },

    SearchCMD: function(value){
      // console.log('Search CMD: ' + value)
      //todo: suggest possible website commands
      // have js create a list sent to the client, and modify options for admins
      // also include hints and descriptions to what these commands do in the list
      // also prioritize hints based on frequent use

      if(headerSearchAutofill){
        if(value && value !== ''){
          let searchList = advancedSearch(value, SearchAutofillCMD);
          if(searchList.length === 0){
            headerSearchAutofill.innerHTML = '';
          }
          headerSearchAutofill.innerHTML = formatSearchList(searchList);
        }else{
          headerSearchAutofill.innerHTML = '';
        }
      }
    },

    LoadPage: function(value){
      console.log('Load Page: ' + value)

      if(value.match(/^[\w_\-\/]+$/)){
        window.open(value, '_self');
      }
      //todo: handle search with ajax (search site for pages)
      // may include advanced feature for prioritizing sub pages of the existing page
    },

    RunCMD: function(value){
      console.log('Run CMD: ' + value)
      //todo: handle CMD with ajax
      // run commands or search the server (recognizing wheather or not the user is an admin)
      // may add optional event listener for running custom commands
    },
  };


  function advancedSearch(value, search){
    let res = [];
    let used = [];

    function checkSearch(value, scoreUpgrade = 0){
      for(let i = 0; i < search.length; i++){
        if(used.includes(search[i])){
          let ri = used.indexOf(search[i]);
          if(res[ri] && res[ri].value === search[i]){
            res[ri].score += 0.05;
          }
          continue;
        }

        let score = 0;
        if(search[i].startsWith(value)){
          score += 1 - ((search[i].length - value.length) / 1000);
        }else if(search[i].includes(value)){
          score += 0.5 - ((search[i].length - value.length) / 1000);
        }else{
          let s = 0;
          let vOffset = 0;
          let sOffset = 0;
          let last;
          let loops = 0;
          for(let j = 0; j < Math.min(value.length, search[i].length); j++){
            if(!value[j+vOffset] || !search[i][j+sOffset]){
              break;
            }

            let offset = 0;
            if(last && value[j+vOffset] === last){
              vOffset++;
              offset += 0.2;
            }
            if(last && search[i][j+sOffset] === last){
              sOffset++;
              offset += 0.2;
            }
            if(offset > 0.2){
              offset = 0;
            }

            if(!value[j+vOffset] || !search[i][j+sOffset]){
              break;
            }

            if(value[j+vOffset] === search[i][j+sOffset]){
              if(!value[j+vOffset].match(/\s/)){
                s += 1 - offset;
              }else{
                s += (1 - offset) / 100;
              }
              last = value[j+vOffset];
            }else if(spellTypoList[value[j+vOffset]] && spellTypoList[value[j+vOffset]].includes(search[i][j+sOffset])){
              if(!value[j+vOffset].match(/\s/)){
                s += 0.7 - offset;
              }else{
                s += (0.7 - offset) / 100;
              }
            }else if(spellTypoList[search[i][j+sOffset]] && spellTypoList[search[i][j+sOffset]].includes(value[j+vOffset])){
              if(!value[j+vOffset].match(/\s/)){
                s += 0.5 - offset;
              }else{
                s += (0.5 - offset) / 100;
              }
            }else if(window.innerWidth < MobileWidth && mobileTypoList[value[j+vOffset]] && mobileTypoList[value[j+vOffset]].includes(search[i][j+sOffset])){
              if(!value[j+vOffset].match(/\s/)){
                s += 0.3 - offset;
              }else{
                s += (0.3 - offset) / 100;
              }
            }else if(window.innerWidth < MobileWidth && mobileTypoList[search[i][j+sOffset]] && mobileTypoList[search[i][j+sOffset]].includes(value[j+vOffset])){
              if(!value[j+vOffset].match(/\s/)){
                s += 0.1 - offset;
              }else{
                s += (0.1 - offset) / 100;
              }
            }
            loops++
          }

          if(loops !== 0){
            if(value.length > search[i].length){
              score += (s/loops) - ((search[i].length - value.length) / 1000);
            }else if(value.length > search[i].length){
              score += (s/loops) - ((search[i].length - value.length) / 1000);
            }else{
              score += (s/loops) - (search[i].length / 1000);
            }
          }
        }

        if(value.length > search[i].length){
          score -= (value.length - search[i].length) * 0.25;
        }

        if(score > 0.3){
          if(searchHistory[search[i]]){
            score += 0.5 + (searchHistory[search[i]] * 0.25);
          }

          if(userSearchHistory[search[i]]){
            score += 0.25 + (userSearchHistory[search[i]] * 0.1);
          }

          if(globalSearchHistory[search[i]]){
            score += 0.075 + (globalSearchHistory[search[i]] * 0.025);
          }

          res.push({value: search[i], score: score + scoreUpgrade});
          used.push(search[i]);
        }
      }
    }

    let lastVal = value.replace(/^.*\s([^\s]+)$/, '$1');
    if(lastVal !== value){
      checkSearch(lastVal, 0.25);
    }
    checkSearch(value);

    res.sort(function(a, b){
      if(a.score > b.score){
        return -1;
      }else if(a.score < b.score){
        return 1;
      }
      return 0;
    });

    return res.map(function(val){
      return val.value;
    });
  }

  function formatSearchList(list){
    return list.map(function(val){
      return '<li tabIndex="-1">'+val+'</li>';
    }).join('');
  }


  const header = document.querySelector('header');
  if(!header){
    return;
  }

  let lastFocusedElement = null;

  const headerTop = header.querySelector('.header-top')
  const headerMenu = header.querySelector('ul.header-menu');
  const headerSearch = header.querySelector('.header-search input');
  const headerSearchBTN = header.querySelector('.header-ctrl-search');
  const headerNavBTN = header.querySelector('.header-ctrl-nav');
  const headerNavMenu = header.querySelector('#nav-menu');

  if(headerMenu){
    // let init = true;
    function onResize(){
      const children = headerMenu.children;
      for(let i = 0; i < children.length && headerTop.clientWidth >= headerTop.scrollWidth; i++){
        children[i].style['display'] = '';
      }

      let hasHidden = false;
      for(let i = children.length-1; i >= 0 && headerTop.clientWidth < headerTop.scrollWidth; i--){
        hasHidden = true;
        if(children[i].style['display'] !== 'none'){
          children[i].style['display'] = 'none';
        }
      }
  
      if(headerNavBTN){
        if(hasHidden){
          headerNavBTN.classList.add('show-nav');
        }else{
          headerNavBTN.classList.remove('show-nav');
        }
      }
    }
  
    if(headerNavBTN){
      headerNavBTN.classList.add('disable-transition');
    }
    onResize();
    let ms = 0;
    const interval = setInterval(function(){
      onResize();
      ms += 0.1;
      if(ms >= 3){
        clearInterval(interval);
        headerNavBTN.classList.remove('disable-transition');
        // init = false;
      }
    }, 10);
    window.addEventListener('resize', onResize);


    headerMenu.querySelectorAll('.submenu').forEach(function(elm){
      const par = elm.parentElement;
      function onClick(e){
        // e.preventDefault();
        if(par === e.target){
          elm.classList.toggle('active');
        }
      }
      par.addEventListener('mousedown', onClick, true);
      par.addEventListener('touchstart', onClick, true);
    });

    function handleSubmenu(elm, eInd = 0){
      elm.classList.remove('right');
      elm.classList.remove('up');

      let realInd = eInd

      let rect = elm.getBoundingClientRect();

      /* if(eInd === 1){
        if(rect.left < window.innerWidth/2){
          elm.classList.add('right');
          eInd++;
        }
      } */

      if(realInd !== 0 && ((eInd % 2 === 0 && rect.left + (rect.width*2) + elm.parentNode.clientWidth < window.innerWidth - 20) || rect.left < 20)){
        elm.classList.add('right');
      }else if(realInd === 0 && rect.left + rect.width > window.innerWidth - 20){
        elm.classList.add('right');
      }

      /* rect = elm.getBoundingClientRect();
      if(rect.left < 20){
        elm.classList.remove('right');
      } */

      setInterval(function(){
        let rect = elm.getBoundingClientRect();
        if(eInd != 0 && rect.top > elm.clientHeight && rect.top > 20){
          elm.classList.add('up');
        }
        if(rect.top + rect.height > window.innerHeight - 20){
          elm.classList.add('up');
        }
        /* if(rect.left + rect.width > window.innerWidth){
          elm.classList.remove('right');
        } */
      }, 100);

      elm.querySelectorAll(':scope > ul > li > .submenu').forEach(function(elm){
        handleSubmenu(elm, eInd+1);
      });
    }

    function onResizeHeaderMenu(){
      headerMenu.querySelectorAll(':scope > li > .submenu').forEach(function(elm){
        handleSubmenu(elm);
      });
    }
    onResizeHeaderMenu();
    window.addEventListener('resize', onResizeHeaderMenu);
  }

  let headerSearchFocused = false;
  if(headerSearch){
    if(headerNavBTN){
      headerSearch.parentNode.addEventListener('focusin', function() {
        headerSearchFocused = true;
        headerNavBTN.classList.add('header-ctrl-close');
        setTimeout(function(){
          headerNavBTN.href = '#';
        }, 500);
      });
    }


    headerSearch.parentNode.addEventListener('focusout', function() {
      headerSearchFocused = false;
      if(headerNavBTN){
        headerNavBTN.classList.remove('header-ctrl-close');
      }
      setTimeout(function(){
        headerNavBTN.href = '#nav-menu';
      }, 500);
      lastFocusedElement = null;
    });

    function submitFormHeader(){
      if(headerSearch.value.startsWith(':')){
        headerSearch.value = headerSearch.value.replace(':', '');
        SearchHandler.RunCMD(headerSearch.value);
        headerSearch.value = ':';
        return;
      }

      SearchHandler.LoadPage(headerSearch.value);
      headerSearch.value = '';
    }

    if(headerSearchBTN){
      function onClick(e){
        if(document.activeElement === headerSearch){
          e.preventDefault();
          headerSearch.focus();

          if(headerSearch.value !== ''){
            // headerSearch.parentNode.submit();
            submitFormHeader();
          }
        }
      }
      headerSearchBTN.addEventListener('mousedown', onClick, true);
      headerSearchBTN.addEventListener('touchstart', onClick, true);
    }

    headerSearch.addEventListener('input', function(e) {
      if(headerSearch.value && headerSearch.value.startsWith(':')){
        headerSearch.classList.add('cmd-mode');
        headerSearch.name = 'cmd';

        SearchHandler.SearchCMD(headerSearch.value.replace(':', ''));
        return;
      }
      headerSearch.classList.remove('cmd-mode');
      headerSearch.name = 's';

      SearchHandler.SearchPage(headerSearch.value);
    });

    headerSearch.parentNode.addEventListener('submit', function(e) {
      e.preventDefault();
      /* if(headerSearch.value.startsWith(':')){
        headerSearch.value = headerSearch.value.replace(':', '');
        SearchHandler.RunCMD(headerSearch.value);
        headerSearch.value = ':';
        return;
      }
      
      SearchHandler.LoadPage(headerSearch.value);
      headerSearch.value = ''; */
      submitFormHeader();
    }, true);

    headerSearch.setAttribute('autocomplete', 'off');

    headerSearchAutofill = document.createElement('ul');
    headerSearchAutofill.classList.add('search-autofill');
    headerSearch.parentNode.appendChild(headerSearchAutofill);

    document.addEventListener('keydown', function(e) {
      if(e.ctrlKey){
        if(e.code === 'KeyF' || e.code === 'Slash' || (e.shiftKey && e.code === 'KeyP')){
          e.preventDefault();

          if(document.activeElement && !lastFocusedElement){
            lastFocusedElement = document.activeElement;
          }

          headerSearch.focus();
          if(e.shiftKey && !headerSearch.value.startsWith(':')){
            headerSearch.value = ':'+headerSearch.value;
            headerSearch.classList.add('cmd-mode');
            headerSearch.name = 'cmd';
          }
        }
      }
    }, true);

    headerSearch.parentNode.addEventListener('keydown', function(e) {
      if(e.code === 'Escape'){
        e.preventDefault();

        if(document.activeElement.parentNode === headerSearchAutofill){
          headerSearch.focus();
          return;
        }

        document.activeElement.blur();
        if(lastFocusedElement){
          lastFocusedElement.focus();
          lastFocusedElement = null;
        }
      }else if(e.code === 'ArrowUp'){
        e.preventDefault();

        let elm
        if(document.activeElement.parentNode === headerSearchAutofill){
          elm = document.activeElement.previousElementSibling;
        }

        if(!elm){
          elm = headerSearchAutofill.querySelector('li:last-child');
        }

        if(elm){
          elm.focus();
        }
      }else if(e.code === 'ArrowDown'){
        e.preventDefault();

        let elm;
        if(document.activeElement.parentNode === headerSearchAutofill){
          elm = document.activeElement.nextElementSibling;
        }

        if(!elm){
          elm = headerSearchAutofill.querySelector('li:first-child')
        }

        if(elm){
          elm.focus();
        }
      }else if(e.code === 'Enter' && document.activeElement.parentNode === headerSearchAutofill){
        e.preventDefault();
        let val = document.activeElement.textContent;

        if(headerSearch.value && headerSearch.value.startsWith(':')){
          headerSearch.value = ':'+val;
        }else{
          headerSearch.value = val;
        }

        headerSearch.focus();

        if(headerSearch.classList.contains('cmd-mode')){
          SearchHandler.SearchCMD(headerSearch.value.replace(':', ''));
        }else{
          SearchHandler.SearchPage(headerSearch.value);
        }

        if(!searchHistory[val]){
          searchHistory[val] = 1;
        }else{
          searchHistory[val]++;
        }
      }else if(e.code === 'Tab' && document.activeElement.parentNode === headerSearchAutofill){
        e.preventDefault();
        let val = document.activeElement.textContent;
        let sVal = headerSearch.value.replace(/(\s|^)[^\s]*$/, '$1'+val);

        if(headerSearch.value && headerSearch.value.startsWith(':') && !sVal.startsWith(':')){
          headerSearch.value = ':'+sVal;
        }else{
          headerSearch.value = sVal;
        }

        headerSearch.focus();

        if(headerSearch.classList.contains('cmd-mode')){
          SearchHandler.SearchCMD(headerSearch.value.replace(':', ''));
        }else{
          SearchHandler.SearchPage(headerSearch.value);
        }

        if(!searchHistory[val]){
          searchHistory[val] = 0.7;
        }else{
          searchHistory[val] += 0.7;
        }
      }
    }, true);

    setInterval(function(){
      headerSearchAutofill.querySelectorAll('li:not([click-event-added])').forEach(function(elm){
        elm.setAttribute('click-event-added', '');

        elm.addEventListener('click', function(e) {
          e.preventDefault();

          let val = elm.textContent;

          if(headerSearch.value && headerSearch.value.startsWith(':')){
            headerSearch.value = ':'+val;
          }else{
            headerSearch.value = val;
          }

          headerSearch.focus();

          if(headerSearch.classList.contains('cmd-mode')){
            SearchHandler.SearchCMD(headerSearch.value.replace(':', ''));
          }else{
            SearchHandler.SearchPage(headerSearch.value);
          }

          if(!searchHistory[val]){
            searchHistory[val] = 1;
          }else{
            searchHistory[val]++;
          }
        });
      });
    });
  }

  if(headerNavBTN){
    let hasFocus = false;
    let hasHover = false;

    headerNavBTN.addEventListener('click', function(){
      if(headerNavBTN.classList.contains('header-ctrl-close')){
        headerNavBTN.classList.remove('header-ctrl-close');
        setTimeout(function(){
          headerNavBTN.href = '#nav-menu';
          hasFocus = false;
          hasHover = false;
        }, 500);
      }
    });

    function onFocus(){
      headerNavBTN.classList.add('header-ctrl-close');
      setTimeout(function(){
        headerNavBTN.href = '#';
      }, 500);
    }
    headerNavMenu.addEventListener('focusin', function(){
      hasFocus = true;
      onFocus();
    });
    headerNavMenu.addEventListener('mouseover', function(){
      hasHover = true;
      onFocus();
    });

    function onBlur(){
      if(hasFocus || hasHover || headerSearchFocused){
        return;
      }
      headerNavBTN.classList.remove('header-ctrl-close');
      setTimeout(function(){
        headerNavBTN.href = '#nav-menu';
      }, 500);
    }
    headerNavMenu.addEventListener('focusout', function(){
      hasFocus = false;
      onBlur();
    });
    headerNavMenu.addEventListener('mouseout', function(){
      hasHover = false;
      onBlur();
    });
  }

  if(headerNavMenu){
    // const headerNavMenuList = headerNavMenu.querySelector('ul');

    headerNavMenu.querySelectorAll('.submenu').forEach(function(elm){
      const par = elm.parentElement;

      /* let active = {
        class: false,
        focus: false,
        hover: false,
      }; */

      /* function toggleFocusHeight(){
        if(active.class || active.focus || active.hover){
          setTimeout(function(){
            elm.style['max-height'] = '100%';
          }, 750);
        }else{
          elm.style['max-height'] = '';
        }
      } */

      function onClick(e){
        // e.preventDefault();
        if(par === e.target){
          elm.classList.toggle('active');
          // active.class = elm.classList.contains('active');
          // toggleFocusHeight();
        }
      }
      par.addEventListener('mousedown', onClick, true);
      par.addEventListener('touchstart', onClick, true);

      elm.style['overflow-y'] = 'hidden';

      let lastSet = 0;
      setInterval(function(){
        let now = Date.now();
        if(now < lastSet){
          return;
        }
        lastSet = now + 300;

        if(elm.clientHeight < window.innerHeight){
          elm.style['max-height'] = '';
        }
        if(elm.clientHeight >= window.innerHeight && elm.scrollHeight > elm.clientHeight){
          elm.style['max-height'] = (elm.clientHeight + (window.innerHeight)) + 'px';
        }
      }, 10);

      /* par.addEventListener('focusin', function(e) {
        active.focus = true;
        toggleFocusHeight();
      });
      par.addEventListener('focusout', function(e) {
        active.focus = false;
        toggleFocusHeight();
      });

      par.addEventListener('mouseover', function(e) {
        active.hover = true;
        toggleFocusHeight();
      });
      par.addEventListener('mouseout', function(e) {
        active.hover = false;
        toggleFocusHeight();
      }); */
    });
  }

  ;(async function(){
    function onPageLoad(){
      if(page){
        page.querySelectorAll('[id],'+searchHeaders.join(',')).forEach(function(elm){
          if(!SearchAutofillValues.includes(elm.id)){
            SearchAutofillValues.push(elm.id);
          }
          if(searchHeaders.includes(elm.tagName.toLowerCase()) && !SearchAutofillValues.includes(elm.textContent)){
            SearchAutofillValues.push(elm.textContent);
          }
        });
      }
    }
    onPageLoad();

    document.addEventListener('FetchPageLoaded', function(e) {
      page = e.detail.page;
      SearchAutofillValues = [];

      setTimeout(function(){
        if(headerNavBTN){
          headerNavBTN.classList.remove('header-ctrl-close');
          setTimeout(function(){
            headerNavBTN.setAttribute('href', '#nav-menu');
          }, 700);
        }
      }, 10);

      onPageLoad();
    });
  })();

})();

;(function(){
  let page = document.querySelector('#page');
  let main = undefined;
  let footer = undefined;
  if(page){
    main = page.querySelector('main');
    footer = page.querySelector('footer');
  }

  const header = document.querySelector('header .header-top');

  const bottomMenu = document.querySelector('header #bottom-menu');
  const headerNavMenu = document.querySelector('header #nav-menu');

  function onResize(){
    if(!page || !main || !footer){
      return;
    }

    let footerMaxHeight = window.innerHeight;
    if(header){
      footerMaxHeight -= header.clientHeight;
    }

    let offset = 0;
    let scrollOffset = 0;
    if(bottomMenu && bottomMenu.children.length && !page.classList.contains('fullscreen') && window.innerWidth < MobileWidth){
      offset = bottomMenu.clientHeight + 5;
      scrollOffset = 5;

      if(headerNavMenu){
        headerNavMenu.style['margin-bottom'] = (offset - 5) + 'px';
      }
    }else if(headerNavMenu){
      headerNavMenu.style['margin-bottom'] = '';
    }

    let backToContent = footer.querySelector('.back-to-content');

    if(page.scrollHeight > page.clientHeight && footer.clientHeight < footerMaxHeight){
      main.style['margin-bottom'] = (footer.clientHeight + offset) + 'px';
      footer.style['margin-bottom'] = offset + 'px';
      footer.style['position'] = 'fixed';
  
      if(footer.clientHeight > footerMaxHeight/1.75){
        if(!backToContent){
          backToContent = document.createElement('a');
          backToContent.classList.add('back-to-content');
          backToContent.innerHTML = '<i class="fa-solid fa-caret-up"></i>';
          backToContent.href = '#';
      
          footer.appendChild(backToContent);
      
          backToContent.addEventListener('click', function(e) {
            e.preventDefault();
            page.scrollBy(0, (footer.clientHeight - (page.scrollHeight - window.innerHeight - page.scrollTop) + scrollOffset) * -1);
          });
        }
        backToContent.style['display'] = '';
      }else if(backToContent){
        backToContent.style['display'] = 'none';
      }
    }else{
      main.style['margin-bottom'] = '';
      footer.style['position'] = '';

      if(backToContent){
        backToContent.style['display'] = 'none';
      }
    }
  }
  onResize();
  window.addEventListener('resize', onResize);

  document.addEventListener('FetchPageLoaded', function(e) {
    page = e.detail.page;
    if(!page){
      return;
    }
    main = page.querySelector('main');
    footer = page.querySelector('footer');
    if(!main || !footer){
      return;
    }

    onResize();
  });
})();

;(async function(){
  // listen for mobile swipe to open nav menu
  const touchMinDistance = 50;

  const headerNavBTN = document.querySelector('header .header-ctrl-nav');
  const headerNavMenu = document.querySelector('header #nav-menu');
  if(!headerNavBTN || !headerNavMenu){
    return;
  }

  let mouseDownPos = null;

  function onMouseDown(e){
    let touch;
    if(e.type === 'touchstart'){
      touch = e.touches[0] || e.changedTouches[0];
    }else{
      touch = e;
    }

    mouseDownPos = {
      x: touch.pageX,
      y: touch.pageY,
    }
  }

  function onMouseUp(e){
    if(!mouseDownPos){
      return;
    }

    let touch;
    if(e.type === 'touchend'){
      touch = e.touches[0] || e.changedTouches[0];
    }else{
      touch = e;
    }

    if(Math.abs(touch.pageY - mouseDownPos.y) > 250 || Math.abs(touch.pageX - mouseDownPos.x) < 50){
      mouseDownPos = null;
      return;
    }

    if(headerNavMenu === document.activeElement || headerNavMenu.contains(document.activeElement)){
      setTimeout(function(){
        headerNavBTN.focus();
        headerNavBTN.click();
      }, 10);

      mouseDownPos = null;
      return;
    }

    if(mouseDownPos.x < window.innerWidth - touchMinDistance && touch.pageX < window.innerWidth - touchMinDistance && mouseDownPos.x > touchMinDistance && touch.pageX > touchMinDistance){
      mouseDownPos = null;
      return;
    }

    setTimeout(function(){
      headerNavBTN.focus();
      headerNavBTN.click();
    }, 10);
  }

  document.addEventListener('touchstart', onMouseDown);
  document.addEventListener('touchend', onMouseUp);

  //temp: 'mousedown' is only for debuging desktop
  if(DebugMode){
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
  }
})();

;(async function(){
  let page = document.querySelector('#page');

  const adViewTime = 2500;
  const adVisibleOffset = 50;

  function seenAd(id){
    console.log('user seen ad:', id);
    //todo: send visibility of ad and its id to server
  }


  let headerHeight = 0;

  const header = document.querySelector('header .header-top');
  if(header){
    headerHeight = header.clientHeight;
  }

  setInterval(function(){
    if(!page){
      return;
    }

    page.querySelectorAll('a[href]:not([link-ready])').forEach(function(elm){
      elm.setAttribute('link-ready', '');

      if(!elm.hasAttribute('target') && elm.hasAttribute('href') && elm.getAttribute('href').match(/^https?:\/\//) && elm.href && !elm.href.startsWith(window.location.origin)){
        elm.setAttribute('target', '_blank');
      }
    });

    page.querySelectorAll('.ad:not([ad-ready])').forEach(function(elm){
      elm.setAttribute('ad-ready', '');

      let adSeen = 0;
      let logged = false;

      const video = elm.querySelector('video:first-child');
      if(video){
        video.removeAttribute('autoplay');
        function playVideo(){
          let rect = elm.getBoundingClientRect();
          if(rect.top + elm.clientHeight - window.innerHeight - headerHeight - adVisibleOffset < 0 && rect.top - headerHeight + adVisibleOffset > 0){
            video.play().then(function(){
              if(!logged && adSeen === 0){
                adSeen = Date.now();
                setTimeout(function(){
                  if(!logged && adSeen !== 0 && !video.paused && Date.now() - adSeen > adViewTime){
                    logged = true;
                    seenAd(elm.getAttribute('ad-id'));
                  }
                }, adViewTime + 500);
              }
            }).catch(function(e){});
          }else{
            if(Date.now() - adSeen < adViewTime){
              adSeen = 0;
            }
            video.pause();
          }
        }
        page.addEventListener('scroll', playVideo);
        window.addEventListener('resize', playVideo);
        playVideo();
      }else{
        function detectVisible(){
          let rect = elm.getBoundingClientRect();
          if(rect.top + elm.clientHeight - window.innerHeight - headerHeight - adVisibleOffset < 0 && rect.top - headerHeight + adVisibleOffset > 0){
            if(!logged && adSeen === 0){
              adSeen = Date.now();
              setTimeout(function(){
                if(!logged && adSeen !== 0 && Date.now() - adSeen > adViewTime){
                  logged = true;
                  seenAd(elm.getAttribute('ad-id'));
                }
              }, adViewTime + 500);
            }
          }else if(Date.now() - adSeen < adViewTime){
            adSeen = 0;
          }
        }
        page.addEventListener('scroll', detectVisible);
        window.addEventListener('resize', detectVisible);
        detectVisible();
      }
    });
  }, 100);

  document.addEventListener('FetchPageLoaded', function(e) {
    setTimeout(function(){
      page = e.detail.page;
    }, 500);
  });
})();
