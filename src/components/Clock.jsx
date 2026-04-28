import React from "react";

class Clock extends React.Component {
  constructor(props) {
    super(props);
    this.updateDate = this.updateDate.bind(this);
      
    this.days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    this.months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    this.state = {
      date: new Date().toLocaleTimeString(),
      day: this.days[new Date().getDay()],
      month: this.months[new Date().getMonth()]
    };
    this.interval = null;
  }

  componentDidMount() {
    this.interval = setInterval(this.updateDate, 1000);
  }
    
  componentWillUnmount() {
    clearInterval(this.interval);
  }
    
  updateDate() {
    this.setState({
      date: new Date().toLocaleTimeString(),
      day: this.days[new Date().getDay()],
      month: this.months[new Date().getMonth()]
    });
  }
    
  render() {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center">
        <div className="font-black text-foreground">
          {this.state.date}
        </div>
        <div className="font-black text-foreground/80">
          {this.state.day}
        </div>
      </div>
    );
  }
}

export default Clock
