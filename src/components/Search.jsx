import React from "react";

class SearchBox extends React.Component {
  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
    this.state = {
      disabled: "1",
    };
  }

  buttonToggle(e) {
    const id = e.target.dataset.engineId;
    if (!id) {
      return;
    }

    this.setState({ disabled: id });
    if (this.inputRef.current) {
      this.inputRef.current.value = "";
    }
  }

  sendSearch(e) {
    if (e.key === "Enter") {
      const buttons = document.querySelectorAll("button[data-address]");

      for (let i = 0; i < buttons.length; i += 1) {
        if (buttons[i].disabled === true) {
          const address = buttons[i].dataset.address;
          const input = encodeURIComponent(e.target.value);
          const url = `${address}${input}`;

          window.open(url);
          e.target.value = "";
          break;
        }
      }
    }
  }

  render() {
    return (
      <div className="flex justify-center">
        <div>
          <div className="flex space-x-8 justify-center pt-8 pb-8" onClick={this.buttonToggle.bind(this)}>
              <button className="bg-google-icon bg-no-repeat w-8 h-8 outline-inherit cursor-pointer border-none disabled:opacity-100 opacity-50"
                      type="button" disabled={this.state.disabled === "1"}
                      data-engine-id="1" data-address="http://www.google.com/search?q=">
              </button>
              <button className="bg-duck-icon bg-no-repeat w-8 h-8 outline-inherit cursor-pointer border-none disabled:opacity-100 opacity-50"
                      type="button" disabled={this.state.disabled === "2"}
                      data-engine-id="2" data-address="https://www.duckduckgo.com/?q="></button>
              <button className="bg-wolfram-icon bg-no-repeat w-8 h-8 outline-inherit cursor-pointer border-none disabled:opacity-100 opacity-50"
                      type="button" disabled={this.state.disabled === "3"}
                      data-engine-id="3" data-address="https://www.wolframalpha.com/input/?i="></button>
              <button className="bg-stack-icon bg-no-repeat w-8 h-8 outline-inherit cursor-pointer border-none disabled:opacity-100 opacity-50"
                      type="button" disabled={this.state.disabled === "4"}
                      data-engine-id="4" data-address="https://stackoverflow.com/search?q="></button>
          </div>
          <input
            className="search-input items-center w-60 h-5 boarder-none bg-off-white1 border-white border border-solid border-gray-300 rounded-xl focus:border-red2 focus:outline-none"
            autoFocus
            id="search-input"
            type="text"
            ref={this.inputRef}
            onKeyDown={this.sendSearch}
          />
        </div>
      </div>
    );
  }
}

export default SearchBox
