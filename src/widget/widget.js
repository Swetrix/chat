import { h, Component } from 'preact';
import ChatFrame from './chat-frame';
import ChatFloatingButton from './chat-floating-button';
import ChatTitleMsg from './chat-title-msg';
import ArrowIcon from './arrow-icon';
import {
    desktopTitleStyle,
    desktopWrapperStyle,
    mobileOpenWrapperStyle,
    mobileClosedWrapperStyle,
    desktopClosedWrapperStyleChat
} from './style';

export default class Widget extends Component {
    constructor() {
        super();
        this.state.isChatOpen = false;
        this.state.pristine = true;
        this.state.wasChatOpened = this.wasChatOpened();
    }

    render({ conf, isMobile }, { isChatOpen, pristine }) {
        const wrapperWidth = {width: conf.desktopWidth};
        const desktopHeight = (window.innerHeight - 100 < conf.desktopHeight) ? window.innerHeight - 90 : conf.desktopHeight;

        let wrapperStyle;
        if (!isChatOpen && (isMobile || conf.alwaysUseFloatingButton)) {
            wrapperStyle = { ...mobileClosedWrapperStyle}; // closed mobile floating button
        } else if (!isMobile){
            wrapperStyle = (conf.closedStyle === 'chat' || isChatOpen || this.wasChatOpened()) ?
                (isChatOpen) ?
                    { ...desktopWrapperStyle, ...wrapperWidth, position: 'fixed', borderRadius: 3, } // desktop mode, button style; boxShadow: 'rgba(203, 203, 203, 0.75) 1px 1px 4px'
                    :
                    { ...desktopWrapperStyle}
                :
                { ...desktopClosedWrapperStyleChat}; // desktop mode, chat style
        } else {
            wrapperStyle = mobileOpenWrapperStyle; // open mobile wrapper should have no border
        }

        return (
            <div style={wrapperStyle}>
                {/* Open/close button */}
                { (isMobile || conf.alwaysUseFloatingButton) && !isChatOpen ?

                    <ChatFloatingButton color={conf.mainColor} onClick={this.onClick}/>

                    :

                    (conf.closedStyle === 'chat' || isChatOpen || this.wasChatOpened()) ?
                        <div style={{background: conf.mainColor, ...desktopTitleStyle}} onClick={this.onClick}>
                            <div style={{display: 'flex', alignItems: 'center', padding: '0px 12px 0px 0px'}}>
                                {isChatOpen ? conf.titleOpen : conf.titleClosed}
                            </div>
                            <ArrowIcon isOpened={isChatOpen}/>
                        </div>
                        :
                        <ChatTitleMsg onClick={this.onClick} conf={conf}/>
                }

                {/*Chat IFrame*/}
                <div style={{
                    display: isChatOpen ? 'block' : 'none',
                    height: isMobile ? '100%' : desktopHeight
                }}>
                    {pristine ? null : <ChatFrame {...this.props} /> }
                </div>

            </div>
        );
    }

    onClick = () => {
        let stateData = {
            pristine: false,
            isChatOpen: !this.state.isChatOpen,
        }

        if(!this.state.isChatOpen && !this.wasChatOpened()){
            this.setCookie();
            stateData.wasChatOpened = true;
        }

        this.setState(stateData);
    }

    setCookie = () => {
        let date = new Date()
        let expirationTime = parseInt(this.props.conf.cookieExpiration)
        date.setTime(date.getTime()+(expirationTime*24*60*60*1000))
        let expires = '; expires='+date.toGMTString()
        document.cookie = 'chatwasopened=1'+expires+'; path=/'
    }

    wasChatOpened = () => {
        return document.cookie.split(';').some((item) => item.trim().startsWith('chatwasopened='))
    }
}
