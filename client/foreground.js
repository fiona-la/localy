{
  // add poppins to everthing
  const poppinsUrl =
    "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap";
  const link = document.createElement("link");
  link.href = poppinsUrl;
  link.rel = "stylesheet";
  document.head.appendChild(link);

  //may want to alter radius
  const radius = "10000";

  // trims excess white space
  if (typeof String.prototype.trim === "undefined") {
    String.prototype.trim = () => String(this).replace(/^\s+|\s+$/g, "");
  }

  // using Geolocation API to get coordinates
  // returns a promise of coordinates instead of using a callback function
  const getCoordinates = () =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve(coords),
        (err) => console.log(err),
        { enableHighAccuracy: true }
      );
    });

  // gets all cart items
  const getCartItems = () => {
    const itemList = document.querySelector(
      "#activeCartViewForm > div.a-row.a-spacing-mini.sc-list-body.sc-java-remote-feature"
    ).children;
    let productNameList = [];

    for (let i = 0; i < itemList.length; i++) {
      const item = itemList[i];

      // ignores nodes that are not listings (such as <script> nodes, etc)
      if (item.id === "") continue;

      // gets first chunk of product name
      const productName = item.getElementsByClassName("a-list-item")[0].innerText;

      // adds product name to list
      productNameList.push(productName);
    }

    return productNameList;
  };

  // gets local shop for a specific category
  const getLocalShops = async (coords, category) => {
    const { latitude, longitude } = coords;

    // new local shops array
    let newLocalShops = [];

    // gets place details using Google Places API
    // const serverUrl = `http://localhost:3000/?query=${category}&location=${latitude},${longitude}&radius=${radius}`;
    const serverUrl = `https://polar-dusk-20032.herokuapp.com/?query=${category}&location=${latitude},${longitude}&radius=${radius}`;
    const res = await fetch(serverUrl, { method: "GET" });
    const localShops = await res.json();

    // gets distance from user location to each place using distance API
    for (const shop of localShops) {
      const { lat, lng } = shop.geometry.location;

      const distanceUrl = `https://polar-dusk-20032.herokuapp.com/distance?userLat=${latitude}&userLng=${longitude}&busLat=${lat}&busLng=${lng}`;
      const response = await fetch(distanceUrl, { method: "GET" });
      const distance = await response.text();

      // creates new shop object with distance value
      const newShopObj = { ...shop, distance: distance };
      newLocalShops.push(newShopObj);
    }

    return { [category]: newLocalShops };
  };

  // gets local shops for each product in the cart
  // resolves all promises in parallel
  const getLocalShopsList = async (coords, categoryList) => {
    console.log(coords);
    // runs "getLocalShops()" without await
    // promisesList is an array filled with unresolved promises
    const promisesList = categoryList.map((category) => getLocalShops(coords, category));

    // resolve all promises in parallel
    const resolvedPromiseList = await Promise.allSettled(promisesList);

    // format to array of local shops
    const localShopsList = resolvedPromiseList.map((item) => item.value);

    return localShopsList;
  };

  const createUIElements = (cartItems) => {
    // function to toggleMenu
    const toggleMenu = () =>
      localyMenu.style.display === "none"
        ? (localyMenu.style.display = "block")
        : (localyMenu.style.display = "none");

    // grab body
    const body = document.body;

    // function to create button that opens menu
    const createStickyButton = () => {
      const stickyButton = document.createElement("div");
      stickyButton.className = "localy-sticky-button";
      stickyButton.onclick = toggleMenu;

      const img = document.createElement("img");
      img.src = chrome.runtime.getURL("logo_name_small.png");
      img.className = "localy-sticky-button-img";

      stickyButton.appendChild(img);

      return stickyButton;
    };

    // function to create localyMenu
    const createLocalyMenu = () => {
      const localyMenu = document.createElement("div");
      localyMenu.className = "localy-menu";
      localyMenu.style.display = "none";

      // create header
      const localyHeader = document.createElement("img");
      localyHeader.className = "localy-menu-header";
      localyHeader.src = chrome.runtime.getURL("logo_name.png");

      // create body
      const bodyContainer = document.createElement("div");
      bodyContainer.className = "localy-menu-body";

      // creates list of accordion elements
      for (const productName of cartItems) {
        const cartItem = document.createElement("div");

        const text = document.createElement("p");
        text.innerHTML = productName;

        const arrow = document.createElement("i");
        arrow.className = "fas fa-chevron-right";

        const accordionContainer = document.createElement("div");
        accordionContainer.style.display = "none";
        accordionContainer.className = "localy-menu-body-accordion-content-container";
        accordionContainer.setAttribute("data-name", productName);

        // helper function to open/close accordions
        const toggleAccordionBody = (e) => {
          // if click is in accordion container, ignore
          if (accordionContainer.contains(e.target)) return;

          if (accordionContainer.style.display === "none") {
            accordionContainer.style.display = "block";
            arrow.className = "fas fa-chevron-down";
          } else {
            accordionContainer.style.display = "none";
            arrow.className = "fas fa-chevron-right";
          }
        };

        cartItem.className = "localy-menu-body-accordion";
        cartItem.onclick = toggleAccordionBody;

        const spinner = document.createElement("div");
        spinner.className = "localy-spinner";
        accordionContainer.appendChild(spinner);

        cartItem.appendChild(text);
        cartItem.appendChild(arrow);
        cartItem.appendChild(accordionContainer);

        bodyContainer.appendChild(cartItem);
      }

      // add elements to localyMenu
      localyMenu.appendChild(localyHeader);
      localyMenu.appendChild(bodyContainer);

      return localyMenu;
    };

    // create UI elements
    const stickyButton = createStickyButton();
    const localyMenu = createLocalyMenu();

    // event listener to close localyMenu when clicked outside of it
    document.addEventListener("click", (e) => {
      const menuIsOpened = localyMenu.style.display === "block";
      const clickedInsideMenuOrButton =
        localyMenu.contains(e.target) || stickyButton.contains(e.target);

      if (menuIsOpened && !clickedInsideMenuOrButton) {
        localyMenu.style.display = "none";
      }
    });

    // add elements to the page
    body.appendChild(stickyButton);
    body.appendChild(localyMenu);
  };

  const addMenuContent = (localShopsList) => {
    for (const itemObj of localShopsList) {
      const itemName = Object.keys(itemObj)[0];
      const localShops = Object.values(itemObj)[0];

      const accordionContentBody = document.querySelector(`[data-name="${itemName}"]`);

      // removes spinner
      accordionContentBody.innerHTML = "";

      for (const shop of localShops) {
        console.log(shop);

        const shopName = shop.name;
        const shopAddress1 = shop.formatted_address.split(",")[0];
        const shopAddress2 = shop.formatted_address.split(",").slice(1).join(",");
        const distance = shop.distance;

        // create url
        const formattedShopAddress = shop.formatted_address.replace(/ /g, "+");
        const shopAddressUrl = `https://google.com/maps/place/${formattedShopAddress}`;

        // create listing element
        const listing = document.createElement("div");
        listing.className = "localy-menu-body-accordion-listing";

        // shop name element
        const shopNameElement = document.createElement("h6");
        shopNameElement.innerHTML = shopName;
        listing.appendChild(shopNameElement);

        // distance element
        const shopDistanceElement = document.createElement("span");
        shopDistanceElement.innerHTML = distance + " km";
        listing.appendChild(shopDistanceElement);

        // shop address text elements
        const shopAddress1Element = document.createElement("p");
        shopAddress1Element.innerHTML = shopAddress1;
        const shopAddress2Element = document.createElement("p");
        shopAddress2Element.innerHTML = shopAddress2;

        // shop address url element
        const shopAddressUrlElement = document.createElement("a");
        shopAddressUrlElement.href = shopAddressUrl;
        shopAddressUrlElement.target = "_blank";
        shopAddressUrlElement.appendChild(shopAddress1Element);
        shopAddressUrlElement.appendChild(shopAddress2Element);
        listing.appendChild(shopAddressUrlElement);

        // append listing to body
        accordionContentBody.appendChild(listing);
      }
    }
  };

  // main async function
  const runMain = async () => {
    // gets an array of product names in the cart
    const cartItems = getCartItems();

    // creates UI elements
    createUIElements(cartItems);

    // gets coordinate information
    const coordinates = await getCoordinates();

    // gets list of localshops
    const localShopsList = await getLocalShopsList(coordinates, cartItems);

    addMenuContent(localShopsList);
  };

  // async fetch function; runs get request for each item in cart
  runMain();
}
