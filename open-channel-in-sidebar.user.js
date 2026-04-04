// ==UserScript==
// @name         Open Channel from Sidebar
// @namespace    http://tampermonkey.net
// @version      1.0.7
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

    /** Sidebar “Up next”: channel name span — see lockup path with .yt-lockup-metadata-view-model__text-container. */
    const CHANNEL_SPAN_MATCH_SELECTORS = [
        'yt-lockup-metadata-view-model .yt-lockup-metadata-view-model__text-container yt-content-metadata-view-model > div:nth-child(1) > span',
        '#contents yt-lockup-metadata-view-model .yt-lockup-metadata-view-model__text-container yt-content-metadata-view-model > div:nth-child(1) > span',
        'yt-lockup-view-model yt-content-metadata-view-model > div:nth-child(1) > span',
    ];

    function matchesChannelSpanSelectors(el) {
        if (!el || el.tagName !== 'SPAN') return false;
        for (let i = 0; i < CHANNEL_SPAN_MATCH_SELECTORS.length; i++) {
            try {
                if (el.matches(CHANNEL_SPAN_MATCH_SELECTORS[i])) return true;
            } catch (e) { /* ignore */ }
        }
        return false;
    }

    /** Structural match (works when :matches/#contents fails across shadow boundaries). */
    function isChannelSpanByStructure(el) {
        if (!el || el.tagName !== 'SPAN') return false;
        const meta = el.closest('yt-content-metadata-view-model');
        if (!meta) return false;
        const lockupMeta = el.closest('yt-lockup-metadata-view-model');
        if (!lockupMeta) return false;
        const textBox = lockupMeta.querySelector('.yt-lockup-metadata-view-model__text-container');
        if (!textBox || !textBox.contains(meta)) return false;
        const firstRow = meta.querySelector(':scope > div:nth-child(1)');
        return !!(firstRow && firstRow.contains(el));
    }

    function isSidebarChannelNameTarget(el) {
        if (!el) return false;
        if (el.tagName === 'YT-FORMATTED-STRING' && el.classList.contains('ytd-channel-name')) {
            return true;
        }
        return matchesChannelSpanSelectors(el) || isChannelSpanByStructure(el);
    }

    /** Video watch/shorts URL on the lockup; channel span is often outside the same anchor. */
    function getSidebarVideoAnchor(el) {
        const direct = el.closest('a');
        if (direct && (/[?&]v=/.test(direct.href) || /\/shorts\//.test(direct.href))) return direct;
        const lockup = el.closest('yt-lockup-view-model');
        if (lockup) {
            const link =
                lockup.querySelector('a#video-title[href]') ||
                lockup.querySelector('a[href*="/watch?v="]') ||
                lockup.querySelector('a[href*="watch?v="]') ||
                lockup.querySelector('a[href*="/shorts/"]');
            if (link) return link;
        }
        return direct || null;
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
    // Function to extract and display channel URL
    function getChannelURL(videoElement) {


        // Get the video URL
        var videoURL = videoElement.dataset.originalHref;

        var videoID = videoIdFromHref(videoURL);
        if (!videoID) {
            console.error('open-channel-in-sidebar: could not parse video id from', videoURL);
            return;
        }

        // Use the YouTube Data API to fetch video details, including channel ID
        var apiUrl = 'https://www.googleapis.com/youtube/v3/videos?id=' + videoID + '&key=' + apikey + '&part=snippet';
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                var channelID = data.items[0].snippet.channelId;

                // Construct the channel URL
                var channelURL = 'https://www.youtube.com/channel/' + channelID;

                // Display the channel URL in the console
                console.log('Channel URL:', channelURL);
                // Replace the href with your custom link
                videoElement.href = channelURL; // Replace with your desired URL
                videoElement.dataset.newHref = channelURL;
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
    // Handle click events on the document
    document.addEventListener('click', function (event) {
        var target = event.target;

        if (isSidebarChannelNameTarget(target)) {
            var anchorElement = getSidebarVideoAnchor(target);

            // Check if an "a" element is found and has a dataset.originalHref attribute
            if (anchorElement && anchorElement.dataset.originalHref) {
                // Prevent the default behavior (e.g., following the original link)
                event.preventDefault();
                event.stopPropagation();
                console.log('test');
                // Navigate to your custom URL
                window.location.href = anchorElement.href;
            }
        }
    });
})();