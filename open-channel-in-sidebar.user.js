// ==UserScript==
// @name         Open Channel from Sidebar
// @namespace    http://tampermonkey.net
// @version      1.0.1
// @description  Opens the channel page, when clicking on the creator in the sidebar
// @author       Maxamax
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @updateurl    https://github.com/Maxamax1/youtube-channel-link/raw/main/open-channel-in-sidebar.user.js
// @downloadURL  https://github.com/Maxamax1/youtube-channel-link/raw/main/open-channel-in-sidebar.user.js
// @grant        none
// ==/UserScript==

(function () {
    
    if (!(window.location.href.indexOf("youtube") > -1)) {
        return;
    }

    'use strict';
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

        // Parse the video URL to get the video ID
        var videoID = videoURL.match(/[?&]v=([^&]+)/)[1];

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
        if (target.tagName === 'YT-FORMATTED-STRING' && target.classList.contains('ytd-channel-name')) {
            var anchorElement = target.closest('a');
            if (!(anchorElement.dataset.originalHref)) {
                // Save the original href
                anchorElement.dataset.originalHref = anchorElement.href;

            }
            target.onclick = null;
            anchorElement.click = null;
            target.onclick = function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var target1 = ev.target;
                var anchorElement1 = target1.closest('a');
                window.location.href = anchorElement1.href;
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

        // Check if the target element is a "yt-formatted-string"
        if (target.tagName === 'YT-FORMATTED-STRING') {
            // Find the closest "a" ancestor of the "yt-formatted-string" element
            var anchorElement = target.closest('a');

            // Check if an "a" element is found and has a dataset.originalHref attribute
            if (anchorElement && anchorElement.dataset.originalHref) {
                // Restore the original href
                anchorElement.href = anchorElement.dataset.originalHref;

                // Remove the dataset.originalHref attribute
                //delete anchorElement.dataset.originalHref;
            }
        }
    });
    // Handle click events on the document
    document.addEventListener('click', function (event) {
        var target = event.target;

        // Check if the target element is a "yt-formatted-string"
        if (target.tagName === 'YT-FORMATTED-STRING' && target.classList.contains('ytd-channel-name')) {
            // Find the closest "a" ancestor of the "yt-formatted-string" element
            var anchorElement = target.closest('a');

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