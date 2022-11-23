;(async function(){
  if(typeof fetch !== 'function'){
    return;
  }

  const body = document.body || document.querySelector('body');
  if(!body){
    return;
  }

  let page = document.querySelector('[main-page-content]');
  if(!page){
    return;
  }

  let scrollElm = undefined;
  if(page.scrollHeight){
    scrollElm = page;
  }else if(body.scrollHeight){
    scrollElm = body;
  }else if(window.scrollHeight){
    scrollElm = window;
  }


  const EventFetchPageLoaded = new CustomEvent('FetchPageLoaded', {detail: {}});
  const elmAttr = 'main-page-content';
  const DefaultMobileWidth = 800;


  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function(){
      EventFetchPageLoaded.detail.page = page;
      document.dispatchEvent(EventFetchPageLoaded);
    }, 10);
  });


  const currentOrigin = window.location.origin;
  let currentURL = window.location.href;
  let currentPath = window.location.pathname;
  let currentTimeStamp = Date.now();
  const popPageHistory = {};


  function onElmClick(elm){
    elm.addEventListener('click', function(e) {
      e.preventDefault();

      if(elm.href.replace(/#[\w_-]*\??/, '') === window.location.href.replace(/#[\w_-]*\??/, '')){
        if(scrollElm.scrollTop === 0){
          window.open(elm.href, '_self');
        }else if(scrollElm.scrollTop > 5000){
          scrollElm.scrollTo({top: 0, behavior: 'instant'});
        }else{
          scrollElm.scrollTo({top: 0});
        }
        return;
      }

      // disable clicking before page loads (also prevents double clicking from sending 2 page requests)
      elm.style['pointer-events'] = 'none';

      sessionStorage.setItem('scrollpos:'+window.location.pathname, scrollElm.scrollTop);

      let fetchURL = elm.href;
      if(fetchURL.includes('?')){
        fetchURL += '&';
      }else{
        fetchURL += '?';
      }
      fetchURL += (new URLSearchParams({FetchLoading: true})).toString();

      fetch(fetchURL).then(function(res){
        if(res.status != 200){
          window.open(elm.href, '_self');
          elm.style['pointer-events'] = '';
          return undefined;
        }

        if(res.headers.get('content-type').includes('application/json')){
          return res.json();
        }
 
        return res.text();
      }).then(function(data){
        if(!data){
          return;
        }

        if(typeof data === 'string'){
          let contTag = undefined;
          let contStart = 0;
          let contEnd = 0;
          data.replace(/<(\/|)([\w_-]+)(\s+.*?|)>/gs, function(_, closing, tag, attrs, i){
            if(contTag === null){
              return;
            }
            
            if(contEnd < 0){
              contEnd = i;
              contTag = null;
              return;
            }
            
            if(contTag){
              if(tag === contTag){
                if(closing === ''){
                  contEnd++;
                }else{
                  contEnd--;
                }
              }
              return;
            }
            
            if(closing === '' && attrs.split(/(?:^|\s+)([^\s]*?(?:=(?:[^\s*]|"(?:\\[\\"]|[^"])*?"|'(?:\\[\\']|[^'])*?'|`(?:\\[\\`]|[^`])*?`)|))(?:$|\s+)/gs).includes(elmAttr)){
              contTag = tag
              contStart = i;
            }
            
            return '';
          });

          if(contTag !== null){
            // data = data.substring(contStart);
            window.open(elm.href, '_self');
            elm.style['pointer-events'] = '';
            return;
          }

          data = data.substring(contStart, contEnd);

          currentTimeStamp = Date.now();
          window.history.pushState('fetch-page-loader:' + currentTimeStamp, '', elm.href);
          currentURL = elm.href;
          setTimeout(function(){
            currentPath = window.location.pathname;
          }, 10);
        }else if(typeof data === 'object' && data.content){
          if(data.url && data.url !== '' && ((data.url.match(/^[\\\/]?[\w_-]+/) && !data.url.match(/^https?:\/\//) && !data.url.match(/^[\w_-]+:\/\//)) || data.url.startsWith(window.location.origin))){
            currentTimeStamp = Date.now();  
            window.history.pushState('fetch-page-loader:' + currentTimeStamp, '', data.url);
            currentURL = data.url;
            setTimeout(function(){
              currentPath = window.location.pathname;
            }, 10);
          }else{
            currentTimeStamp = Date.now();
            window.history.pushState('fetch-page-loader:' + currentTimeStamp, '', elm.href);
            currentURL = elm.href;
            setTimeout(function(){
              currentPath = window.location.pathname;
            }, 10);
          }
          data = data.content.toString();
        }else{
          window.open(elm.href, '_self');
          elm.style['pointer-events'] = '';
          return;
        }


        const tmpWrapper = document.createElement('div');
        tmpWrapper.style['display'] = 'none';
        tmpWrapper.innerHTML = data;
        const newPage = tmpWrapper.firstChild;

        newPage.classList.add('fetch-loading');
        newPage.style.setProperty('--fetch-pos-x', (e.pageX - (window.innerWidth/2)) + 'px');
        newPage.style.setProperty('--fetch-pos-y', (e.pageY - (window.innerHeight/2)) + 'px');
        popPageHistory[currentTimeStamp] = {mouseX: e.pageX, mouseY: e.pageY};

        page.parentNode.insertBefore(newPage, page);
        tmpWrapper.remove();

        let handledScroll = false;

        setTimeout(function(){
          newPage.focus();

          if(scrollElm === page){
            handledScroll = true;
            scrollElm = newPage;
            let scrollPos = sessionStorage.getItem('scrollpos:'+window.location.pathname);
            if(scrollPos){
              scrollElm.scrollTo({
                top: scrollPos,
                behavior: 'instant',
              });
            }
          }
        }, 10);

        EventFetchPageLoaded.detail.page = newPage;
        document.dispatchEvent(EventFetchPageLoaded);

        newPage.querySelectorAll('*').forEach(function(elm){
          let css = window.getComputedStyle(elm);
          if(css && css['background-attachment'] === 'fixed'){
            elm.classList.add('fetch-loading-fix-img');
          }
        });

        setTimeout(function(){
          newPage.classList.add('fetch-loading-done');

          setTimeout(function(){
            newPage.classList.remove('fetch-loading', 'fetch-loading-done');
            page.remove();
            page = newPage;
            elm.style['pointer-events'] = '';

            setTimeout(function(){
              page.querySelectorAll('.fetch-loading-fix-img').forEach(function(elm){
                elm.classList.remove('fetch-loading-fix-img');
              });

              if(!handledScroll){
                let scrollPos = sessionStorage.getItem('scrollpos:'+window.location.pathname);
                if(scrollPos){
                  if(scrollPos > 5000){
                    scrollElm.scrollTo({
                      top: scrollPos,
                      behavior: 'instant',
                    });
                  }else{
                    scrollElm.scrollTo({
                      top: scrollPos,
                      // behavior: 'instant',
                    });
                  }
                }
              }
            }, 10);
          }, 500);
        }, 10);
      }).catch(function(){
        window.open(elm.href, '_self');
        elm.style['pointer-events'] = '';
      });
    });
  }

  setInterval(function(){
    document.querySelectorAll('a:not([fancy-link-ready])').forEach(function(elm){
      elm.setAttribute('fancy-link-ready', '');
      if(!elm.href || elm.href === '' || !elm.href.startsWith(window.location.origin) || elm.getAttribute('href').replace(window.location.origin, '').match(/^[^\w_\-\\/]+/)){
        return;
      }

      onElmClick(elm);
    });
  }, 100);

  let popSelfTriggered = 0;
  function returnToUrl(timeStamp){
    popSelfTriggered++;
    if(timeStamp < currentTimeStamp){
      window.history.forward();
    }else{
      window.history.back();
    }
  }

  window.addEventListener('popstate', function(e) {
    if(popSelfTriggered > 0){
      e.preventDefault();
      popSelfTriggered--;
      return;
    }

    if(!window.location.href || window.location.href === '' || window.location.origin !== currentOrigin || !window.location.href.startsWith(currentOrigin) || window.location.href.replace(currentOrigin, '').match(/[^\w_\-\\/]+/)){
      return;
    }

    let state = window.history.state;
    let timeStamp = 0;
    if(state && state !== ''){
      if(!state.startsWith('fetch-page-loader:')){
        return;
      }
      timeStamp = Number(state.replace('fetch-page-loader:', '')) || 0;
    }

    if(scrollElm.scrollTop !== 0){
      let mWidth = DefaultMobileWidth;
      if(typeof MobileWidth !== 'undefined' && Number(MobileWidth)){
        mWidth = Number(MobileWidth);
      }

      if(window.innerWidth < mWidth){
        e.preventDefault();
        returnToUrl(timeStamp);
        if(scrollElm.scrollTop > 5000){
          scrollElm.scrollTo({top: 0, behavior: 'instant'});
        }else{
          scrollElm.scrollTo({top: 0});
        }
        return;
      }
    }

    if(window.location.href.replace(/#[\w_-]*\??/, '') === currentURL.replace(/#[\w_-]*\??/, '')){
      return;
    }

    e.preventDefault();

    sessionStorage.setItem('scrollpos:'+currentPath, scrollElm.scrollTop);

    let fetchURL = window.location.href;
    if(fetchURL.includes('?')){
      fetchURL += '&';
    }else{
      fetchURL += '?';
    }
    fetchURL += (new URLSearchParams({FetchLoading: true})).toString();

    fetch(fetchURL).then(function(res){
      if(res.status != 200){
        window.location.reload();
        return undefined;
      }

      if(res.headers.get('content-type').includes('application/json')){
        return res.json();
      }

      return res.text();
    }).then(function(data){
      if(!data){
        return;
      }

      let oldTimeStamp = currentTimeStamp;

      if(typeof data === 'string'){
        let contTag = undefined;
        let contStart = 0;
        let contEnd = 0;
        data.replace(/<(\/|)([\w_-]+)(\s+.*?|)>/gs, function(_, closing, tag, attrs, i){
          if(contTag === null){
            return;
          }
          
          if(contEnd < 0){
            contEnd = i;
            contTag = null;
            return;
          }
          
          if(contTag){
            if(tag === contTag){
              if(closing === ''){
                contEnd++;
              }else{
                contEnd--;
              }
            }
            return;
          }
          
          if(closing === '' && attrs.split(/(?:^|\s+)([^\s]*?(?:=(?:[^\s*]|"(?:\\[\\"]|[^"])*?"|'(?:\\[\\']|[^'])*?'|`(?:\\[\\`]|[^`])*?`)|))(?:$|\s+)/gs).includes(elmAttr)){
            contTag = tag
            contStart = i;
          }
          
          return '';
        });

        if(contTag !== null){
          // data = data.substring(contStart);
          window.location.reload();
          return;
        }

        data = data.substring(contStart, contEnd);

        currentTimeStamp = timeStamp;
        currentURL = window.location.href;
        currentPath = window.location.pathname;
      }else if(typeof data === 'object' && data.content){
        if(data.url && data.url !== '' && ((data.url.match(/^[\\\/]?[\w_-]+/) && !data.url.match(/^https?:\/\//) && !data.url.match(/^[\w_-]+:\/\//)) || data.url.startsWith(window.location.origin))){
          window.history.replaceState('fetch-page-loader:' + timeStamp, '', data.url);
          currentTimeStamp = timeStamp;
          currentURL = data.url;
          currentPath = window.location.pathname;
        }else{
          currentTimeStamp = timeStamp;
          currentURL = window.location.href;
          currentPath = window.location.pathname;
        }
        data = data.content.toString();
      }else{
        window.location.reload();
        return;
      }

      const tmpWrapper = document.createElement('div');
      tmpWrapper.style['display'] = 'none';
      tmpWrapper.innerHTML = data;
      const newPage = tmpWrapper.firstChild;

      if(timeStamp > oldTimeStamp){
        newPage.classList.add('fetch-loading');
        if(popPageHistory[timeStamp]){
          newPage.style.setProperty('--fetch-pos-x', (popPageHistory[timeStamp].mouseX - (window.innerWidth/2)) + 'px');
          newPage.style.setProperty('--fetch-pos-y', (popPageHistory[timeStamp].mouseY - (window.innerHeight/2)) + 'px');
        }else{
          newPage.style.setProperty('--fetch-pos-x', ((window.innerWidth/2) - (window.innerWidth/2)) + 'px');
          newPage.style.setProperty('--fetch-pos-y', ((window.innerHeight/2) - (window.innerHeight/2)) + 'px');
        }

        page.parentNode.insertBefore(newPage, page);
        tmpWrapper.remove();

        let handledScroll = false;

        setTimeout(function(){
          newPage.focus();

          if(scrollElm === page){
            handledScroll = true;
            scrollElm = newPage;
            let scrollPos = sessionStorage.getItem('scrollpos:'+window.location.pathname);
            if(scrollPos){
              scrollElm.scrollTo({
                top: scrollPos,
                behavior: 'instant',
              });
            }
          }
        }, 10);

        EventFetchPageLoaded.detail.page = newPage;
        document.dispatchEvent(EventFetchPageLoaded);

        newPage.querySelectorAll('*').forEach(function(elm){
          let css = window.getComputedStyle(elm);
          if(css && css['background-attachment'] === 'fixed'){
            elm.classList.add('fetch-loading-fix-img');
          }
        });

        setTimeout(function(){
          newPage.classList.add('fetch-loading-done');

          setTimeout(function(){
            newPage.classList.remove('fetch-loading', 'fetch-loading-done');
            page.remove();
            page = newPage;

            setTimeout(function(){
              page.querySelectorAll('.fetch-loading-fix-img').forEach(function(elm){
                elm.classList.remove('fetch-loading-fix-img');
              });

              if(!handledScroll){
                let scrollPos = sessionStorage.getItem('scrollpos:'+window.location.pathname);
                if(scrollPos){
                  if(scrollPos > 5000){
                    scrollElm.scrollTo({
                      top: scrollPos,
                      behavior: 'instant',
                    });
                  }else{
                    scrollElm.scrollTo({
                      top: scrollPos,
                      // behavior: 'instant',
                    });
                  }
                }
              }
            }, 10);
          }, 500);
        }, 10);

        return;
      }

      page.parentNode.insertBefore(newPage, page);
      tmpWrapper.remove();

      page.classList.add('fetch-loading', 'fetch-loading-done');
      if(popPageHistory[oldTimeStamp]){
        page.style.setProperty('--fetch-pos-x', (popPageHistory[oldTimeStamp].mouseX - (window.innerWidth/2)) + 'px');
        page.style.setProperty('--fetch-pos-y', (popPageHistory[oldTimeStamp].mouseY - (window.innerHeight/2)) + 'px');
      }else{
        page.style.setProperty('--fetch-pos-x', ((window.innerWidth/2) - (window.innerWidth/2)) + 'px');
        page.style.setProperty('--fetch-pos-y', ((window.innerHeight/2) - (window.innerHeight/2)) + 'px');
      }

      let handledScroll = false;

      setTimeout(function(){
        newPage.focus();

        if(scrollElm === page){
          handledScroll = true;
          scrollElm = newPage;
          let scrollPos = sessionStorage.getItem('scrollpos:'+window.location.pathname);
          if(scrollPos){
            scrollElm.scrollTo({
              top: scrollPos,
              behavior: 'instant',
            });
          }
        }
      }, 10);

      EventFetchPageLoaded.detail.page = newPage;
      document.dispatchEvent(EventFetchPageLoaded);

      page.querySelectorAll('*').forEach(function(elm){
        let css = window.getComputedStyle(elm);
        if(css && css['background-attachment'] === 'fixed'){
          elm.classList.add('fetch-loading-fix-img');
        }
      });

      setTimeout(function(){
        page.classList.remove('fetch-loading-done');

        setTimeout(function(){
          page.remove();
          page = newPage;

          if(!handledScroll){
            let scrollPos = sessionStorage.getItem('scrollpos:'+window.location.pathname);
            if(scrollPos){
              if(scrollPos > 5000){
                scrollElm.scrollTo({
                  top: scrollPos,
                  behavior: 'instant',
                });
              }else{
                scrollElm.scrollTo({
                  top: scrollPos,
                  // behavior: 'instant',
                });
              }
            }
          }
        }, 500);
      }, 10);
    }).catch(function(){
      window.location.reload();
    });
  });
})();
