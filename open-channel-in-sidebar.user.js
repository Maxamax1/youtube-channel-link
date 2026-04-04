// ==UserScript==
// @name         Open Channel from Sidebar
// @namespace    http://tampermonkey.net
// @version      1.0.8
// @description  Opens the channel page, when clicking on the creator in the sidebar
// @author       Maxamax
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @updateurl    https://github.com/Maxamax1/youtube-channel-link/raw/main/open-channel-in-sidebar.user.js
// @downloadURL  https://github.com/Maxamax1/youtube-channel-link/raw/main/open-channel-in-sidebar.user.js
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    
    if (!(window.location.hostname === "www.youtube.com")) {
        return;
    }

    'use strict';

    /** First row under yt-content-metadata-view-model (light DOM or shadow). */
    function getFirstContentMetadataRow(meta) {
        if (!meta) return null;
        var row = meta.querySelector('.ytContentMetadataViewModelMetadataRow');
        if (row) return row;
        if (meta.shadowRoot) {
            return meta.shadowRoot.querySelector('.ytContentMetadataViewModelMetadataRow');
        }
        return null;
    }

    /**
     * New sidebar lockup: channel name is the span in the first .ytContentMetadataViewModelMetadataRow
     * (second row = views • date; those spans share the same classes — only first row counts).
     */
    function isSidebarChannelNameTarget(el) {
        if (!el) return false;
        if (el.tagName === 'YT-FORMATTED-STRING' && el.classList.contains('ytd-channel-name')) {
            return true;
        }
        if (el.tagName !== 'SPAN') return false;
        if (!el.closest('yt-lockup-view-model')) return false;

        var row = el.closest('.ytContentMetadataViewModelMetadataRow');
        if (!row) return false;

        var meta = el.closest('yt-content-metadata-view-model');
        if (!meta) return false;

        var firstRow = getFirstContentMetadataRow(meta);
        return !!(firstRow && firstRow === row && row.contains(el));
    }

    /** Watch URL: thumbnail or title link on the lockup (channel text has no wrapping anchor). */
    function getSidebarVideoAnchor(el) {
        var direct = el.closest('a');
        if (direct && (/[?&]v=/.test(direct.href) || /\/shorts\//.test(direct.href))) return direct;

        var lockup = el.closest('yt-lockup-view-model');
        if (!lockup) return direct || null;

        var link =
            lockup.querySelector('a.yt-lockup-view-model__content-image[href*="watch"]') ||
            lockup.querySelector('a.yt-lockup-metadata-view-model__title[href]') ||
            lockup.querySelector('a#video-title[href]') ||
            lockup.querySelector('a[href*="/watch?v="]') ||
            lockup.querySelector('a[href*="watch?v="]') ||
            lockup.querySelector('a[href*="/shorts/"]');
        return link || direct || null;
    }

    function videoIdFromHref(href) {
        if (!href) return null;
        var m = href.match(/[?&]v=([^&]+)/);
        if (m) return m[1];
        m = href.match(/\/shorts\/([^/?&#]+)/);
        if (m) return m[1];
        return null;
    }

    // get your api key here https://console.cloud.google.com/apis/api/youtube.googleapis.com/
    function getapikey() {
        const ITEM_KEY = 'YOUTUBE_API_KEY';
        const apiKey = window.localStorage.getItem(ITEM_KEY);
        if (apiKey) {
            return apiKey;
          } else {
            const key = prompt('Enter your youtube api key');
            window.localStorage.setItem(ITEM_KEY, key);
            return key;
          }
    }
    let apikey = getapikey();
    // Function to extract and display channel URL; optional onReady(url) for click path
    function getChannelURL(videoElement, onReady) {
        var videoURL = videoElement.dataset.originalHref || videoElement.href;

        var videoID = videoIdFromHref(videoURL);
        if (!videoID) {
            console.error('open-channel-in-sidebar: could not parse video id from', videoURL);
            return;
        }

        var apiUrl = 'https://www.googleapis.com/youtube/v3/videos?id=' + videoID + '&key=' + apikey + '&part=snippet';
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (!data.items || !data.items[0] || !data.items[0].snippet) {
                    console.error('open-channel-in-sidebar: no video in API response', data);
                    return;
                }
                var channelID = data.items[0].snippet.channelId;
                var channelURL = 'https://www.youtube.com/channel/' + channelID;

                console.log('Channel URL:', channelURL);
                videoElement.href = channelURL;
                videoElement.dataset.newHref = channelURL;
                if (onReady) onReady(channelURL);
            })
            .catch(error => {
                console.error('Error fetching video details:', error);
            });
    }

    // Listen for mouseover events on video elements
    document.addEventListener('mouseover', function (event) {
        var target = event.target;
        //console.log('Detected hover:', target.tagName + " " + target.id);
        if (isSidebarChannelNameTarget(target)) {
            var anchorElement = getSidebarVideoAnchor(target);
            if (!anchorElement) return;
            if (!(anchorElement.dataset.originalHref)) {
                // Save the original href
                anchorElement.dataset.originalHref = anchorElement.href;

            }
            target.onclick = null;
            anchorElement.click = null;
            target.onclick = function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var anchorElement1 = getSidebarVideoAnchor(ev.target);
                if (anchorElement1) window.location.href = anchorElement1.href;
            }
            if (!(anchorElement.dataset.newHref)) {
                getChannelURL(anchorElement);
            } else {
                anchorElement.href = anchorElement.dataset.newHref;
            }
            //console.log('channel name is: ' + target.textContent + ' ' + anchorElement.href);
            // When hovering over a video link, get and display the channel URL

        }
    });

    // Listen for mouseout events on the document
    document.addEventListener('mouseout', function (event) {
        var target = event.target;

        if (isSidebarChannelNameTarget(target)) {
            var anchorElement = getSidebarVideoAnchor(target);

            if (anchorElement && anchorElement.dataset.originalHref) {
                anchorElement.href = anchorElement.dataset.originalHref;

                // Remove the dataset.originalHref attribute
                //delete anchorElement.dataset.originalHref;
            }
        }
    });
    function handleChannelNameClick(event) {
        var target = event.target;
        if (!isSidebarChannelNameTarget(target)) return;

        var anchorElement = getSidebarVideoAnchor(target);
        if (!anchorElement) return;

        if (!anchorElement.dataset.originalHref) {
            anchorElement.dataset.originalHref = anchorElement.href;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        if (anchorElement.dataset.newHref) {
            window.location.href = anchorElement.dataset.newHref;
        } else {
            getChannelURL(anchorElement, function (url) {
                window.location.href = url;
            });
        }
    }

    document.addEventListener('click', handleChannelNameClick, true);
})();